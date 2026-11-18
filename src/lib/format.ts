/**
 * Shared presentation formatters.
 *
 * Lives in `src/lib` because these helpers are framework-agnostic and can be
 * reused by Astro pages, client scripts and future server-rendered views.
 * `Intl` instances are created once per module (per isolate in Workers), so
 * repeated renders do not pay the construction cost.
 *
 * SQLite stores datetimes as `YYYY-MM-DD HH:mm:ss` in UTC. Parsing that string
 * with `new Date(value)` is implementation-defined, so `parseSqlDateTime`
 * builds the epoch explicitly with `Date.UTC` and all formatters use UTC.
 */

export type DateInput = string | Date;

const FALLBACK_VALUE = "—";

const SQLITE_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function toDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  return parseSqlDateTime(value);
}

/**
 * Parses a SQLite `YYYY-MM-DD HH:mm:ss` datetime as UTC.
 *
 * ISO strings and other formats supported by `Date` are used as a fallback.
 *
 * @param value - SQLite datetime or ISO date string.
 * @returns A valid `Date`, or `null` when the input cannot be parsed.
 *
 * @example
 * ```ts
 * parseSqlDateTime("2026-11-16 20:14:00") // Date(2026-11-16T20:14:00.000Z)
 * parseSqlDateTime("not-a-date")           // null
 * ```
 */
export function parseSqlDateTime(value: string): Date | null {
  const match = SQLITE_DATETIME_PATTERN.exec(value);

  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day, hours, minutes, seconds = "0"] = match;
  const date = new Date(
    Date.UTC(+year, +month - 1, +day, +hours, +minutes, +seconds),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Converts a date input into the value expected by `<time datetime="...">`.
 *
 * @param value - SQLite datetime, ISO string or `Date`.
 * @returns An ISO 8601 string in UTC, or `null` when the input is invalid.
 *
 * @example
 * ```ts
 * toIsoDateTime("2026-11-16 20:14:00") // "2026-11-16T20:14:00.000Z"
 * ```
 */
export function toIsoDateTime(value: DateInput): string | null {
  return toDate(value)?.toISOString() ?? null;
}

/**
 * Formats a USD amount for display.
 *
 * @param amount - Amount in USD units.
 * @returns A currency string such as `"$145.50"`, or an em dash when the
 *          amount is not a finite number.
 *
 * @example
 * ```ts
 * formatCurrency(145.5) // "$145.50"
 * ```
 */
export function formatCurrency(amount: number): string {
  return Number.isFinite(amount)
    ? CURRENCY_FORMATTER.format(amount)
    : FALLBACK_VALUE;
}

/**
 * Formats a date as a short Spanish date.
 *
 * @param value - SQLite datetime, ISO string or `Date`.
 * @returns A string such as `"16 nov 2026"`, or an em dash when invalid.
 *
 * @example
 * ```ts
 * formatDate("2026-11-16 20:14:00") // "16 nov 2026"
 * ```
 */
export function formatDate(value: DateInput): string {
  const date = toDate(value);

  return date ? DATE_FORMATTER.format(date) : FALLBACK_VALUE;
}

/**
 * Formats a date and time in Spanish, using UTC.
 *
 * @param value - SQLite datetime, ISO string or `Date`.
 * @returns A string such as `"16 nov 2026, 20:14"`, or an em dash when invalid.
 *
 * @example
 * ```ts
 * formatDateTime("2026-11-16 20:14:00") // "16 nov 2026, 20:14"
 * ```
 */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);

  return date ? DATE_TIME_FORMATTER.format(date) : FALLBACK_VALUE;
}
