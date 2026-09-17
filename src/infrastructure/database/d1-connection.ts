import {D1Database} from "@cloudflare/workers-types";


export function getDB(c:{env:{DB:D1Database}}): D1Database{
    return c.env.DB;
}

export async function executeQuery<T = any>(
    db:D1Database,
    sql:string,
    params: unknown[] = []
): Promise<T[]>{
    const results = await db.prepare(sql).bind(...params).all();
    return results.results as T[];
}

export async function executeSingle<T = any>(
    db: D1Database,
    sql:string,
    params: unknown[] = []
): Promise<T | null>{
    const result  = await db.prepare(sql).bind(...params).first<T>();
    return result ?? null;
}