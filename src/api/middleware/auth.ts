import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv, AuthUser } from "@/types/env";
import { verifyAuthToken } from "@/infrastructure/auth/jwt";
import { ForbiddenError, UnauthorizedError } from "@/api/errors/http-error";

/**
 * Name of the cookie used to read an authentication JWT when no Bearer token
 * is supplied in the `Authorization` header.
 */
export const AUTH_COOKIE = "auth_token";

/**
 * Resolves the authenticated user from the request's supported token sources.
 *
 * A non-empty `Authorization: Bearer <token>` value takes precedence over the
 * `auth_token` cookie. If no token is present, or if token verification fails,
 * this helper returns `null`. Token verification also validates the JWT claims
 * required to construct an {@link AuthUser}.
 *
 * @param c - The Hono request context containing the request headers and cookies.
 * @returns The verified user, or `null` when the request has no valid token.
 * @internal
 */
async function readUser(c: Context<AppEnv>): Promise<AuthUser | null> {
  const header = c.req.header("Authorization");
  const bearer = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : undefined;

  const token = bearer ?? getCookie(c, AUTH_COOKIE);
  if (!token) return null;
  return verifyAuthToken(token);
}

/**
 * Requires a valid authentication token and stores its user in the Hono context.
 *
 * The token can be supplied as an `Authorization: Bearer <token>` header or as
 * the `auth_token` cookie. When both are present, the Bearer token is checked.
 * After successful verification, downstream handlers can access the user with
 * `c.get("user")`.
 *
 * @throws {UnauthorizedError} If no token is provided or the token is invalid.
 *
 * @example
 * ```ts
 * app.get("/api/profile", requireAuth, (c) => {
 *   const user = c.get("user");
 *   return c.json({ id: user.id, username: user.username, role: user.role });
 * });
 * ```
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await readUser(c);
  if (!user) throw new UnauthorizedError("Invalid token");
  c.set("user", user);
  await next();
};

/**
 * Requires a valid authentication token belonging to an administrator.
 *
 * The token is read from the Bearer authorization header or the `auth_token`
 * cookie, using the same precedence as {@link requireAuth}. The verified user
 * is stored in the Hono context before the downstream handler is called.
 *
 * @throws {UnauthorizedError} If no token is provided or the token is invalid.
 * @throws {ForbiddenError} If the token is valid but its user role is not `admin`.
 *
 * @example
 * ```ts
 * app.get("/api/admin/reports", requireAdmin, async (c) => {
 *   const admin = c.get("user");
 *   return c.json({ requestedBy: admin.username });
 * });
 * ```
 */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await readUser(c);
  if (!user) throw new UnauthorizedError("invalid token");
  if (user.role !== "admin") throw new ForbiddenError("Admin role is required");
  c.set("user", user);
  await next();
};
