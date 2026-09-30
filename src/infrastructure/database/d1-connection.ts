import type { D1Database } from "@cloudflare/workers-types"


export function getDB(c: { env: { DB: D1Database } }): D1Database {
  return c.env.DB
}

// executeQuery() ejecuta un query SQL y devuelve todas las filas.
// ¿Por qué es una funcion generica (<T = unknown>)?
// Porque puede usarse para cualquier tipo de resultado:
// - T = Goal cuando consultamos la tabla goals
// - T = Donation cuando consultamos la tabla donations
// El tipo se infiere automaticamente segun como se use.
export async function executeQuery<T = unknown>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  // db.prepare(sql) prepara el query (compilacion en el servidor)
  // .bind(...params) sustituye los ? con los valores reales
  // .all() ejecuta el query y devuelve todas las filas
  const results = await db.prepare(sql).bind(...params).all()
  return results.results as T[]
}

// executeSingle() es similar pero para queries que esperan
// un solo registro. Usa .first() en vez de .all().
// Devuelve null si no encuentra nada.
export async function executeSingle<T = unknown>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await db.prepare(sql).bind(...params).first<T>()
  return result ?? null
}