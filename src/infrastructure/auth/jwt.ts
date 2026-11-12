import { sign, verify } from "hono/jwt";
import { env } from "cloudflare:workers";
import type { AuthUser } from "@/types/env";

const ALGORITHM = "HS256";

export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; //7 days

export async function signAuthToken(user: AuthUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      iat: now,
      exp: now + AUTH_TOKEN_TTL_SECONDS,
    },
    env.JWT_SECRET,
    ALGORITHM,
  );
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = await verify(token, env.JWT_SECRET, ALGORITHM);
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.username !== "string") return null;
    if (payload.role !== "admin" && payload.role !== "donor") return null;

    return { id: payload.sub, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
