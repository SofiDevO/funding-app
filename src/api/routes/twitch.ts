import { Hono } from "hono";

import type { AppEnv } from "@/types/env";
import { getTwitchLiveStatus } from "@/lib/twitch";

const twitch = new Hono<AppEnv>();

// TTL shared by the in-memory cache (src/lib/twitch.ts) and the edge cache
// below. Bounding Helix calls to at most one per TTL regardless of traffic
// or number of isolates is what protects the Twitch API quota.
const LIVE_STATUS_CACHE_TTL_SECONDS = 60;

// GET /api/twitch/live

twitch.get("/live", async (c) => {
  // Use a named cache so the call stays within the standard CacheStorage API
  // (typed) while still being shared across isolates at the edge.
  const cache = await caches.open("twitch-live");
  // The cache key must be a Request; normalize to a GET on the canonical URL
  // so query/fragment variations do not fragment the cache.
  const cacheKey = new Request(new URL(c.req.url).toString(), { method: "GET" });

  // 1. Serve from the edge cache when available: no Helix call, no isolate
  //    dependency, shared across all requests and isolates.
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { live } = await getTwitchLiveStatus();
    const response = c.json({ live });
    response.headers.set(
      "Cache-Control",
      `public, max-age=${LIVE_STATUS_CACHE_TTL_SECONDS}, s-maxage=${LIVE_STATUS_CACHE_TTL_SECONDS}`,
    );

    // Store a clone so the body can still be consumed by the client response.
    cache.put(cacheKey, response.clone()).catch(() => {
      // Best-effort: a failed put must never break the request.
    });

    return response;
  } catch (error) {
    console.error("Twitch live status request failed", error);
    // Do not cache failures: keep them retryable and avoid poisoning the cache.
    c.header("Cache-Control", "no-store");
    return c.json({ error: "Live status unavailable" }, 502);
  }
});

export default twitch;
