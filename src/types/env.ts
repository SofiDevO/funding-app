import type { StorageService } from "@/domain/interfaces/storage-service";

export type Variables = {
  db: D1Database;
  r2: StorageService;
  user: AuthUser;
};

export type AppEnv = {
  Bindings: Cloudflare.Env;
  Variables: Variables;
};

export type AuthRole = "admin" | "donor";

/** Datos publicos del token. NUNCA incluye email ni passwordHash. */
export interface AuthUser {
  id: string;
  username: string;
  role: AuthRole;
}
