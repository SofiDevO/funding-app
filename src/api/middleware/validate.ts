import type { Context } from "hono";
import { z, type ZodType } from "zod";
import type { AppEnv } from "@/types/env";

import { BadRequestError } from "../errors/http-error";
import { unknown } from "astro:schema";

/**
 * @parseParam
 * Valida un parametro de ruta (`:id`, `:slug`, ...).
 * Uso: const id = parseParam(c, "id", z.uuid())
 */

export function parseParam<S extends ZodType>(
  c: Context<AppEnv>,
  name: string,
  schema: S,
): z.infer<S> {
  const result = schema.safeParse(c.req.param(name));
  if (!result.success) {
    throw new BadRequestError(`Invalid parameter ${name}`);
  }
  return result.data;
}

export async function parseBody<S extends ZodType>(
  c: Context,
  schema: S,
): Promise<z.infer<S>> {
  let raw = unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    throw new BadRequestError(detail);
  }

  return result.data;
}
