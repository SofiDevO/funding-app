import { env } from "cloudflare:workers";
import { z } from "zod";

const TWITCH_TOKEN_ENDPOINT = "https://id.twitch.tv/oauth2/token";
const TWITCH_HELIX_BASE_URL = "https://api.twitch.tv/helix";
const TOKEN_REQUEST_TIMEOUT_MS = 10_000;
const LIVE_STATUS_REQUEST_TIMEOUT_MS = 10_000;

// Keep client polls from hitting the Helix API on every request. The cache is
// per isolate and only stores public stream status. Aligned with the edge cache
// TTL in the route so both layers agree on freshness.
const LIVE_STATUS_CACHE_MS = 60_000;

// Refresh the token slightly before it expires so requests never use it at
// the boundary. The ratio covers short-lived tokens; the cap prevents
// refreshing too early.
const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 60_000;
const TOKEN_EXPIRY_SAFETY_RATIO = 0.1;

// Twitch responds with access_token, expires_in, token_type, and scope.
// We only validate what we consume; Zod strips the rest.
const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.int().positive(),
});

type TwitchTokenResponse = z.infer<typeof tokenResponseSchema>;

// The streams endpoint returns an empty array when the channel is offline.
// `type` is "live" for active broadcasts; other values (for example, reruns)
// are not considered live for the signal.
const streamsResponseSchema = z.object({
  data: z.array(z.object({ type: z.string() })),
});

/** A token value paired with its absolute expiration time in epoch milliseconds. */
interface CachedToken {
  /** Raw OAuth2 access token sent in the `Authorization` header. */
  value: string;
  /** Epoch timestamp (ms) after which the token must not be reused. */
  expiresAt: number;
}

/** Public live status for the configured channel. */
export interface LiveStatus {
  /** Whether the channel is currently broadcasting. */
  live: boolean;
  /** Epoch timestamp (ms) of the check. */
  checkedAt: number;
}

/**
 * Requests a new Twitch app access token using the OAuth2
 * `client_credentials` grant.
 *
 * Credentials are read lazily on every call so importing this module never
 * depends on the isolate's binding state.
 *
 * @returns The validated token payload returned by Twitch.
 * @throws If credentials are missing, the HTTP request fails, or the response
 * body does not match the expected token shape.
 */
async function requestAccessToken(): Promise<TwitchTokenResponse> {
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;

  // Fail fast: never call Twitch with missing or empty credentials.
  if (!clientId || !clientSecret) {
    throw new Error(
      "Twitch credentials are not configured: missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET",
    );
  }

  // OAuth2 requires form encoding for the client_credentials grant.
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  let response: Response;
  try {
    response = await fetch(TWITCH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    // Wrap network and timeout failures while preserving the original error.
    throw new Error("Twitch token request failed: network error or timeout", {
      cause,
    });
  }

  if (!response.ok) {
    throw new Error(`Twitch token request failed with status ${response.status}`);
  }

  const payload = await readJson(response, "Twitch token");
  const parsed = tokenResponseSchema.safeParse(payload);
  if (!parsed.success) {
    // `safeParse` returns a discriminated union instead of throwing, so the
    // ZodError can be attached as the cause of this domain error.
    throw new Error("Twitch returned an invalid token response", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}

/**
 * Reads a response body as JSON and preserves the original parse error as the
 * `cause` of a domain-specific error.
 *
 * @param response - A response whose body has not been consumed yet.
 * @param context - Label used to identify the failing response in the error.
 * @returns The parsed JSON as `unknown`; callers must validate its shape.
 * @throws If the body is not valid JSON.
 */
async function readJson(response: Response, context: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new Error(`${context} response was not valid JSON`, { cause });
  }
}

/**
 * Isolate-scoped cache for the Twitch app access token.
 *
 * The cache is best-effort: each isolate fetches its own token and can lose it
 * when the isolate is recycled. It only stores the application token, never
 * user data.
 */
class TwitchTokenStore {
  private cached: CachedToken | null = null;
  private pending: Promise<CachedToken> | null = null;

  /**
   * Returns a valid access token, refreshing it when the cached value is
   * missing or expired.
   *
   * Concurrent calls share one in-flight refresh. If that refresh fails, every
   * caller receives the same rejection and the next call retries.
   */
  async get(): Promise<string> {
    if (this.cached && Date.now() < this.cached.expiresAt) {
      return this.cached.value;
    }

    // Single-flight: concurrent callers share the in-flight refresh.
    const pending = (this.pending ??= this.refresh().finally(() => {
      this.pending = null;
    }));

    return (await pending).value;
  }

  /**
   * Fetches a new token and stores it with a safety margin so it is never used
   * at the edge of expiration.
   */
  private async refresh(): Promise<CachedToken> {
    const token = await requestAccessToken();
    const lifetimeMs = token.expires_in * 1000;
    const safetyWindowMs = Math.min(
      TOKEN_EXPIRY_SAFETY_WINDOW_MS,
      lifetimeMs * TOKEN_EXPIRY_SAFETY_RATIO,
    );

    // Build the whole object first so `cached` is updated atomically.
    const cached: CachedToken = {
      value: token.access_token,
      expiresAt: Date.now() + lifetimeMs - safetyWindowMs,
    };

    this.cached = cached;
    return cached;
  }
}

const tokenStore = new TwitchTokenStore();

/**
 * Returns a valid Twitch app access token, using the isolate cache when
 * possible.
 *
 * @returns The access token to send as `Authorization: Bearer <token>`.
 *
 * @example
 * ```ts
 * const token = await getTwitchAccessToken();
 *
 * const response = await fetch("https://api.twitch.tv/helix/streams", {
 *   headers: {
 *     "Client-Id": env.TWITCH_CLIENT_ID,
 *     Authorization: `Bearer ${token}`,
 *   },
 * });
 * ```
 */
export function getTwitchAccessToken(): Promise<string> {
  return tokenStore.get();
}

let cachedLiveStatus: LiveStatus | null = null;

/**
 * Returns whether the configured Twitch channel is currently live.
 *
 * The result is cached per isolate for a short window to avoid calling the
 * Helix API on every client poll. Only public stream status is cached, never
 * user data.
 *
 * @returns The live status and the epoch timestamp (ms) of the check.
 * @throws If `TWITCH_CHANNEL_LOGIN` is missing, the token request fails, the
 * Helix request fails, or the response does not match the expected shape.
 */
export async function getTwitchLiveStatus(): Promise<LiveStatus> {
  const now = Date.now();
  if (
    cachedLiveStatus &&
    now < cachedLiveStatus.checkedAt + LIVE_STATUS_CACHE_MS
  ) {
    return cachedLiveStatus;
  }

  const channelLogin = env.TWITCH_CHANNEL_LOGIN;
  if (!channelLogin) {
    throw new Error(
      "Twitch channel login is not configured: missing TWITCH_CHANNEL_LOGIN",
    );
  }

  const accessToken = await getTwitchAccessToken();
  const url = new URL(`${TWITCH_HELIX_BASE_URL}/streams`);
  url.searchParams.set("user_login", channelLogin);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "Client-Id": env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(LIVE_STATUS_REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new Error(
      "Twitch live status request failed: network error or timeout",
      { cause },
    );
  }

  if (!response.ok) {
    throw new Error(
      `Twitch live status request failed with status ${response.status}`,
    );
  }

  const payload = await readJson(response, "Twitch live status");
  const parsed = streamsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Twitch returned an invalid live status response", {
      cause: parsed.error,
    });
  }

  const status: LiveStatus = {
    live: parsed.data.data.some((stream) => stream.type === "live"),
    checkedAt: Date.now(),
  };

  cachedLiveStatus = status;
  return status;
}
