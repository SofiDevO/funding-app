import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv, AuthUser } from "@/types/env";
import { verifyAuthToken } from "@/infrastructure/auth/jwt";
import { ForbiddenError, UnauthorizedError } from "@/api/errors/http-error";

export const AUTH_COOKIE = "auth_token";

async function readUser(c: Context<AppEnv>): Promise<AuthUser | null> {
  const header = c.req.header("Authorization");
  const bearer = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : undefined;

  const token = bearer ?? getCookie(c, AUTH_COOKIE);
  if (!token) return null;
  return verifyAuthToken(token);
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await readUser(c);
  if (!user) throw new UnauthorizedError("Token ausente, invalido o expirado");
  c.set("user", user);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await readUser(c);
  if (!user) throw new UnauthorizedError("Token ausente, invalido o expirado");
  if (user.role !== "admin") throw new ForbiddenError("Se requiere rol admin");
  c.set("user", user);
  await next();
};
