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


const auth = new Hono<AppEnv>();


function toPublicUser(account:AuthAccount) {
    return{
        id: account.id,
        username: account.username,
        email: account.email,
        role: account.role,
        profilePicture:account.profilePicture
    };
};