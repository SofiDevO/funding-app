import type { Context } from "hono";
import { z, type ZodType } from "zod";
import type { AppEnv } from "@/types/env";

import { BadRequestError } from "../errors/http-error";

/**
 * Reads a route parameter and validates it with a Zod schema.
 *
 * The schema receives the raw string returned by Hono. On success, the parsed
 * value is returned using the schema's inferred output type, including any
 * transformations defined by the schema. On failure, this function throws a
 * `BadRequestError`; the API error handler converts it to an HTTP 400 response.
 *
 * @typeParam S - The Zod schema used to parse the route parameter.
 * @param c - The Hono request context for the current route.
 * @param name - The name of the route parameter, such as `id` in `/goals/:id`.
 * @param schema - The schema that validates and parses the parameter value.
 * @returns The parameter parsed as the schema's inferred output type.
 * @throws {BadRequestError} If the parameter is missing or does not match the schema.
 *
 * @example
 * ```ts
 * app.get("/goals/:id", (c) => {
 *   const id = parseParam(c, "id", z.uuid());
 *   // id is inferred as string and is a valid UUID.
 *   return c.json({ id });
 * });
 * ```
 */
export function parseParam<S extends ZodType>(
  c: Context<AppEnv>,
  name: string,
  schema: S,
): z.infer<S> {
  const result = schema.safeParse(c.req.param(name));

  if (!result.success) {
    throw new BadRequestError(`Parametro invalido: ${name}`);
  }

  return result.data;
}

/**
 * Parses a request body as JSON and validates it with a Zod schema.
 *
 * JSON parsing is performed before schema validation. Zod's parsed output is
 * returned, so defaults, coercions, and transformations in the schema are
 * reflected in the result. Validation issues are combined into a readable
 * message containing each issue's path and description.
 *
 * @typeParam S - The Zod schema used to parse the request body.
 * @param c - The Hono request context for the current route.
 * @param schema - The schema that validates and parses the decoded JSON value.
 * @returns A promise that resolves to the schema's inferred output type.
 * @throws {BadRequestError} If the body is not valid JSON or fails schema validation.
 *
 * @example
 * ```ts
 * const createGoalSchema = z.object({
 *   title: z.string().min(1),
 *   targetAmount: z.number().positive(),
 * });
 *
 * app.post("/goals", async (c) => {
 *   const body = await parseBody(c, createGoalSchema);
 *   // body is inferred as { title: string; targetAmount: number }.
 *   return c.json({ created: body });
 * });
 * ```
 */
export async function parseBody<S extends ZodType>(
  c: Context<AppEnv>,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;

  try {
    raw = await c.req.json();
  } catch {
    throw new BadRequestError("El cuerpo debe ser JSON valido");
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
