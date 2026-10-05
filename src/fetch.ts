import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { actions, middleware, pages, i18n, sessions } from 'astro/hono';
import { env } from 'cloudflare:workers';

import { getDB } from "./infrastructure/database/d1-connection"
import { R2Storage } from "./infrastructure/storage/R2-storage"
import type { R2Bucket } from '@cloudflare/workers-types';


import type { AppEnv } from "./types/env";


import testRoutes from "@/api/routes/test"

const app = new Hono<AppEnv>();
const workerEnv = env as Cloudflare.Env;

app.use('*', logger());
app.use('/api/*', cors());

app.use("/*", async (c, next) => {
  c.set("db", getDB({ env }))
  c.set("r2", new R2Storage(workerEnv.R2_BUCKET as unknown as R2Bucket, workerEnv.R2_PUBLIC_URL))
  await next()
});

app.onError((err,c)=>{
  console.error(err);
  return c.json({error:"Not Found"});
})


app.route("/api/test", testRoutes);

app.use(sessions());
app.use(actions());
app.use(middleware());
app.use(pages());
app.use(i18n());

export default app;