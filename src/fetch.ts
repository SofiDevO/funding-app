import {Hono} from 'hono';
import {logger} from 'hono/logger';
import {cors} from 'hono/cors';
import {actions, middleware, pages, i18n} from 'astro/hono';

// import { getDB } from "./infrastructure/database/d1-connection"
import { R2Storage } from "./infrastructure/storage/R2-storage"
import type { R2Bucket } from '@cloudflare/workers-types';


import type { AppEnv } from "./types/env";

const app = new Hono<AppEnv>();

app.use('*', logger());
app.use('/api/*', cors());

app.use("/*", async (c, next) => {
//   c.set("db", getDB(c))
  c.set("r2", new R2Storage(c.env.IMAGES as unknown as R2Bucket, c.env.R2_PUBLIC_URL))
  await next()
})


app.use(actions());
app.use(middleware());
app.use(pages());
app.use(i18n());

export default app;