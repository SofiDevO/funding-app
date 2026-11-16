import { Hono, type Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";

import type { AuthAccount } from "@/domain/interfaces/auth.repository";
import type { AppEnv } from "@/types/env";
import { D1AuthRepository } from "@/infrastructure/database/auth.repository";
import { Pbkdf2PasswordHasher } from "@/infrastructure/auth/pbkdf2-password-hasher";
import { AUTH_COOKIE, requireAuth } from "../middleware/auth";
import { parseBody } from "../middleware/validate";
import { loginSchema, registerSchema } from "../schemas/auth-schema";
import { ConflictError, UnauthorizedError } from "../errors/http-error";
import {
  AUTH_TOKEN_TTL_SECONDS,
  signAuthToken,
} from "@/infrastructure/auth/jwt";
import { LoginUser } from "@/application/use-cases/auth/login-user";
import { RegisterDonor } from "@/application/use-cases/auth/register-donor";

const auth = new Hono<AppEnv>();

function toPublicUser(account: AuthAccount) {
  return {
    id: account.id,
    username: account.username,
    email: account.email,
    role: account.role,
    profilePicture: account.profilePicture,
  };
}

async function issueSession(c: Context<AppEnv>, account: AuthAccount) {
  const token = await signAuthToken({
    id: account.id,
    username: account.username,
    role: account.role,
  });

  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: AUTH_TOKEN_TTL_SECONDS,
    secure: new URL(c.req.url).protocol === "https:",
  });
  return {token, user: toPublicUser(account)};
};

auth.post("/register", async (c)=>{
    const body = await parseBody(c, registerSchema);
    const result = await new RegisterDonor(
        new D1AuthRepository(c.get("db")),
        new Pbkdf2PasswordHasher(),
    ) .execute(body);
    if (result.kind === "taken") throw new UnauthorizedError("Invalid credentials");
    return c.json(await issueSession(c, result.account));
});

auth.post("/login", async (c) => {
  const body = await parseBody(c, loginSchema);
  const result = await new LoginUser(
    new D1AuthRepository(c.get("db")),
    new Pbkdf2PasswordHasher(),
  ).execute(body);

  if (result.kind === "invalid") {
    throw new UnauthorizedError("Invalid credentials");
  }

  return c.json(await issueSession(c, result.account));
});

auth.get("/me", requireAuth, (c)=> c.json({user: c.get("user")}));

auth.post("/logout", (c)=>{
    deleteCookie(c, AUTH_COOKIE, {path:"/"});
    return c.body(null, 204);
});

export default auth;
