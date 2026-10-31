import { StorageService } from "@/domain/interfaces/storage-service";

export type Variables ={
    db: D1Database,
    r2: StorageService
}

export type AppEnv = {
    Bindings: Cloudflare.Env
    Variables: Variables
}