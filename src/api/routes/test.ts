import { Hono } from "hono";
import { env } from "cloudflare:workers";
import type { AppEnv } from "@/types/env";
import { success } from "astro:schema";

const test = new Hono<AppEnv>();
test.get("db", async (c) => {
  const db = c.get("db");

  try {
    const results = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();

    return c.json({
      success: true,
      tables: results.results.map(
        (row: unknown) => (row as { name: string }).name,
      ),
      message: "D1 connection verified",
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

test.get("/r2", async (c) => {
  const bucket = env.R2_BUCKET;
  try {
    const list = await bucket.list({ limit: 1 });
    return c.json({
      success: true,
      count: list.objects.length,
      message: "R2 connection verified",
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});


export default test;