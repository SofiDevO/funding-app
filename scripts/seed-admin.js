#!/usr/bin/env node
// ============================================
// SEEDER DEL ADMIN INICIAL (interactivo)
// ============================================
// Pregunta destino (development o production), username, email y password.
// Cada ejecucion REEMPLAZA el admin anterior por uno nuevo: el seed es
// reproducible, no acumula filas.
//
// Requiere .dev.vars en la raiz del proyecto (`pnpm infisical:pull`).
//
// El hash usa el MISMO formato que Pbkdf2PasswordHasher
// (src/infrastructure/auth/pbkdf2-password-hasher.ts):
//
//   pbkdf2-sha256$<iteraciones>$<salt hex>$<hash hex>
//
// Si cambias el formato aca, el login deja de verificar. Guia: GUIDE/02/06.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

// ============================================
// CONSTANTES
// ============================================
// Deben coincidir con src/infrastructure/auth/pbkdf2-password-hasher.ts.
// El numero de iteraciones viaja dentro del hash, asi que subirlo despues
// no invalida las filas ya sembradas.
const SCHEME = "pbkdf2-sha256";
const ITERATIONS = 10_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const DB_NAME = "funding-app";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEV_VARS = resolve(ROOT, ".dev.vars");

const encoder = new TextEncoder();
const toHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

// ============================================
// PROMPTS
// ============================================
const rl = createInterface({ input: process.stdin, output: process.stdout });
// Iterador de lineas: guarda las respuestas en cola aunque lleguen todas juntas
// (input por pipe en tests), cosa que rl.question() no garantiza.
const lines = rl[Symbol.asyncIterator]();

function fail(message) {
  console.error(`[seed] Error: ${message}`);
  rl.close();
  process.exit(1);
}

async function nextLine() {
  const { value, done } = await lines.next();
  if (done) throw new Error("stdin cerrado antes de terminar el cuestionario");
  return value;
}

async function prompt(question) {
  process.stdout.write(question);
  return nextLine();
}

function usage() {
  console.log(`Uso:
  pnpm seed:admin            menu: development o production
  pnpm seed:admin:prod       production directo (--remote)

Flags:
  --local     preselecciona development (D1 local)
  --remote    preselecciona production (D1 remota)
  --dry-run   imprime el SQL y no ejecuta wrangler
  --help      muestra esta ayuda

Requisitos:
  - .dev.vars en la raiz del proyecto (pnpm infisical:pull)
  - migraciones aplicadas en el destino

El seed REEMPLAZA el admin existente: no acumula filas.`);
}

// Pregunta texto hasta que el validador devuelva null (sin error).
async function askText(question, validate) {
  for (;;) {
    const answer = (await prompt(question)).trim();
    const error = validate(answer);
    if (!error) return answer;
    console.log(`  ${error}`);
  }
}

// Pregunta sin eco: la password no queda visible en la terminal.
async function askHidden(question) {
  process.stdout.write(question);
  const original = rl._writeToOutput;
  rl._writeToOutput = () => {};
  try {
    const answer = await nextLine();
    process.stdout.write("\n");
    return answer;
  } finally {
    rl._writeToOutput = original;
  }
}

async function askTarget() {
  if (flags.has("--remote")) return true;
  if (flags.has("--local")) return false;

  console.log(`
Destino del seed:
  1) development (D1 local)
  2) production  (D1 remota)
`);

  for (;;) {
    const answer = (await prompt("Opcion [1/2]: ")).trim();
    if (answer === "1") return false;
    if (answer === "2") return true;
    console.log("  Elige 1 o 2.");
  }
}

const validateUsername = (value) => {
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(value)) {
    return "Username invalido: 3-30 caracteres, solo letras, numeros, punto, guion y guion bajo.";
  }
  return null;
};

const validateEmail = (value) => {
  if (value.length < 3 || value.length > 255 || !value.includes("@") || /\s/.test(value)) {
    return "Email invalido.";
  }
  return null;
};

async function askPassword() {
  for (;;) {
    const password = await askHidden("Password (8-128, no se muestra): ");
    if (password.length < 8 || password.length > 128) {
      console.log("  La password debe tener entre 8 y 128 caracteres (loginSchema).");
      continue;
    }
    const repeated = await askHidden("Repite la password: ");
    if (password !== repeated) {
      console.log("  Las passwords no coinciden.");
      continue;
    }
    return password;
  }
}

// ============================================
// HASH
// ============================================
// Misma derivacion que el Worker: PBKDF2-HMAC-SHA256 con Web Crypto.
// Node 22+ (el engine del proyecto) expone `crypto.subtle`, asi que el seeder
// y el login comparten algoritmo, salt, iteraciones y formato de salida.
async function hashPassword(plain) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
  return `${SCHEME}$${ITERATIONS}$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

// ============================================
// SQL
// ============================================
// Comillas simples duplicadas: un apostrofo en el email no rompe la sentencia.
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;

// Reemplaza TODO el contenido de `admin`: el seed no acumula filas. Como el
// id se genera de nuevo, cada ejecucion deja un admin distinto (nuevo UUID,
// nuevo salt, nuevo hash). `DELETE` + `INSERT` van en el mismo --command.
function buildReplaceSql({ id, email, username, passwordHash }) {
  return `DELETE FROM admin;
INSERT INTO admin (id, email, username, password_hash)
VALUES (${sqlString(id)}, ${sqlString(email)}, ${sqlString(username)}, ${sqlString(passwordHash)});`;
}

// ============================================
// CLI
// ============================================
const KNOWN_FLAGS = new Set(["--local", "--remote", "--dry-run", "--help", "-h"]);
const flags = new Set();

for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith("-")) fail(`argumento inesperado: ${arg}. El seeder es interactivo; usa --help.`);
  if (!KNOWN_FLAGS.has(arg)) fail(`flag desconocida: ${arg}`);
  flags.add(arg);
}

if (flags.has("--help") || flags.has("-h")) {
  usage();
  rl.close();
  process.exit(0);
}

if (flags.has("--local") && flags.has("--remote")) {
  fail("--local y --remote son excluyentes");
}

// El proyecto asume que el entorno esta configurado antes de tocar D1.
// Si falta .dev.vars, el desarrollador todavia no corrio `pnpm infisical:pull`.
if (!existsSync(DEV_VARS)) {
  fail("falta .dev.vars en la raiz. Crealo con: pnpm infisical:pull");
}

async function main() {
  const remote = await askTarget();
  const target = remote ? "production (D1 remota)" : "development (D1 local)";

  console.log(`\nDestino: ${target}\n`);

  const username = await askText("Username: ", validateUsername);
  const email = await askText("Email: ", validateEmail);
  const password = await askPassword();

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  const sql = buildReplaceSql({ id, email, username, passwordHash });

  console.log(`
Resumen:
  Destino:  ${target}
  Username: ${username}
  Email:    ${email}
  Password: (oculta)

Se REEMPLAZA el admin actual (si existe) por este nuevo.
`);

  const confirmation = (await prompt("Confirmar seed? (s/N): ")).trim().toLowerCase();
  if (!["s", "si", "sí", "y", "yes"].includes(confirmation)) {
    console.log("[seed] Cancelado. No se toco la base.");
    return;
  }

  if (flags.has("--dry-run")) {
    console.log("\n[seed] --dry-run: SQL que se habria ejecutado:\n");
    console.log(sql);
    return;
  }

  try {
    // execFileSync (no execSync): pasa los argumentos como array, sin shell.
    // El hash contiene `$`, y un shell lo expandiria como variable.
    execFileSync(
      "pnpm",
      [
        "wrangler",
        "d1",
        "execute",
        DB_NAME,
        remote ? "--remote" : "--local",
        "--command",
        sql,
      ],
      { cwd: ROOT, stdio: "inherit" },
    );
  } catch {
    fail("wrangler fallo; revisa la salida de arriba y que las migraciones esten aplicadas");
  }

  console.log(`[seed] Listo. Admin reemplazado en ${target}.`);
}

try {
  await main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  rl.close();
}
