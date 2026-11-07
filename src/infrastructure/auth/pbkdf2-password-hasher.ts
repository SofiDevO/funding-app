
import type { PasswordHasher } from "@/domain/interfaces/password-hasher";

const SCHEME = "pbkdf2-sha256";
const ITERATIONS = 10_000; // limite practico de CPU en Workers Free: ~10 ms
const SALT_BYTES = 16;
const KEY_BITS = 256;
const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

// Solo hex par y valido: cualquier otra cosa se trata como hash corrupto.
function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) throw new Error("Hex invalido");
  return Uint8Array.from({ length: hex.length / 2 }, (_, i) =>
    Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16),
  );
}

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


function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export class Pbkdf2PasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {

    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const derived = await derive(plain, salt, ITERATIONS);
    return `${SCHEME}$${ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
  }

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