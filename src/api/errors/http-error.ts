import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Base error for the API layer. Routes throw subclasses and
 * `app.onError` in `src/fetch.ts` renders them with `httpCode`
 * instead of a generic 500.
 */
export class HttpError extends Error {
  public readonly httpCode: ContentfulStatusCode;

  constructor(message: string, httpCode: ContentfulStatusCode) {
    super(message);
    this.name = new.target.name;
    this.httpCode = httpCode;
  }
}

/** 400 — invalid input or failed validation. */
export class BadRequestError extends HttpError {
  constructor(message = "Bad Request") {
    super(message, 400);
  }
}

/** 401 — missing or invalid JWT. */
export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

/** 403 — authenticated but not allowed (admin-only routes). */
export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

/** 404 — goal, donation or tip not found. */
export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, 404);
  }
}

/** 409 — conflicting state (delete a tip with orders). */
export class ConflictError extends HttpError {
  constructor(message: string) {
    super(message, 409);
  }
}
