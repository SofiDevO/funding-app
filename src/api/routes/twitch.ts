import { Hono } from "hono";

import type { AppEnv } from "@/types/env";
import { getTwitchLiveStatus } from "@/lib/twitch";

const twitch = new Hono<AppEnv>();

// GET /api/twitch/live

twitch.get("/live", async (c) => {
  try {
    const { live } = await getTwitchLiveStatus();
    c.header("Cache-Control", "public, max-age=30");
    return c.json({ live });
  } catch (error) {
    console.error("Twitch live status request failed", error);
    c.header("Cache-Control", "no-store");
    return c.json({ error: "Live status unavailable" }, 502);
  }
});

export default twitch;
