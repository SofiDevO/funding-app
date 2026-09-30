import type {R2Storage} from '../infrastructure/storage/R2-storage';


export type Variables ={
    db: D1Database,
    r2: R2Storage
}

export type AppEnv = {
    Bindings: Cloudflare.Env
    Variables: Variables
}