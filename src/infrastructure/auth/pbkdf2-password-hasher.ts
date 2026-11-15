
import type { PasswordHasher } from "@/domain/interfaces/password-hasher";

/** Identifier stored with each hash to select the supported derivation scheme. */
const SCHEME = "pbkdf2-sha256";
/** Work factor used when creating hashes; keep aligned with the Workers CPU budget. */
const ITERATIONS = 10_000;
/** Random salt length in bytes for each newly generated password hash. */
const SALT_BYTES = 16;
/** Output key length in bits; SHA-256 produces a 32-byte derived key here. */
const KEY_BITS = 256;
const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * Decodes a hexadecimal string into bytes.
 *
 * @param hex - An even-length string containing only hexadecimal characters.
 * @returns The decoded bytes.
 * @throws {Error} If the input contains non-hexadecimal characters or has odd length.
 * @internal
 */
function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) throw new Error("Hex invalido");
  return Uint8Array.from({ length: hex.length / 2 }, (_, i) =>
    Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16),
  );
}

/**
 * Derives a password key with PBKDF2-HMAC-SHA-256 using the Web Crypto API.
 *
 * @param password - The plaintext password to derive from.
 * @param salt - The salt bytes to use for this derivation.
 * @param iterations - The PBKDF2 work factor.
 * @returns The derived key as bytes.
 * @internal
 */
async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new Uint8Array(salt).buffer, iterations, hash: "SHA-256" }, key, KEY_BITS,
  );
  return new Uint8Array(bits);
}


/**
 * Compares equal-length byte arrays using an XOR accumulator.
 *
 * Arrays with different lengths are rejected immediately; equal-length arrays
 * are compared without returning early on the first differing byte.
 *
 * @param a - The first byte array.
 * @param b - The second byte array.
 * @returns `true` when both arrays have the same length and contents.
 * @internal
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Hashes and verifies passwords with PBKDF2-HMAC-SHA-256.
 *
 * Each call to {@link hash} generates a cryptographically random 16-byte salt.
 * The stored representation is
 * `scheme$iterations$saltHex$derivedKeyHex`, allowing {@link verify} to recover
 * the parameters needed to derive and compare a candidate password. Plaintext
 * passwords should never be persisted; store only the returned hash.
 *
 * @example
 * ```ts
 * const hasher = new Pbkdf2PasswordHasher();
 * const storedHash = await hasher.hash(password);
 * // Persist storedHash with the account, never the plaintext password.
 *
 * const passwordMatches = await hasher.verify(password, storedHash);
 * ```
 */
export class Pbkdf2PasswordHasher implements PasswordHasher {
  /**
   * Creates a password hash with a fresh random salt.
   *
   * The returned value uses the format
   * `pbkdf2-sha256$<iterations>$<saltHex>$<derivedKeyHex>`. Because each call
   * uses a new salt, hashing the same password more than once produces
   * different strings; use {@link verify} to check a password against a hash.
   *
   * @param plain - The plaintext password to hash.
   * @returns A promise that resolves to the encoded hash for storage.
   *
   * @example
   * ```ts
   * const passwordHash = await hasher.hash(input.password);
   * await accountRepository.save({ ...account, passwordHash });
   * ```
   */
  async hash(plain: string): Promise<string> {

    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const derived = await derive(plain, salt, ITERATIONS);
    return `${SCHEME}$${ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
  }

  /**
   * Checks a plaintext password against its encoded PBKDF2 hash.
   *
   * The stored scheme and a positive integer iteration count are validated
   * before deriving a candidate key. The salt and expected key are decoded
   * from hexadecimal, then the candidate and stored keys are compared.
   * Malformed, unsupported, or otherwise unusable stored values return `false`.
   *
   * @param plain - The candidate plaintext password.
   * @param stored - The encoded hash previously returned by {@link hash}.
   * @returns A promise that resolves to `true` only when the derived key matches.
   *
   * @example
   * ```ts
   * const passwordMatches = await hasher.verify(input.password, account.passwordHash);
   * if (!passwordMatches) throw new UnauthorizedError("Invalid credentials");
   * ```
   */
  async verify(plain: string, stored: string): Promise<boolean> {
    try {
      const parts = stored.split("$");
      if (parts.length !== 4) return false;
      const [scheme, iterationsRaw, saltHex, hashHex] = parts;
      if (scheme !== SCHEME || !iterationsRaw || !saltHex || !hashHex) return false;

      const iterations = Number(iterationsRaw);
      if (!Number.isInteger(iterations) || iterations <= 0) return false;

      const actual = await derive(plain, fromHex(saltHex), iterations);
      return constantTimeEqual(actual, fromHex(hashHex));
    } catch {
      // Hash corrupto o hex invalido: credencial invalida, no un 500.
      return false;
    }
  }
}