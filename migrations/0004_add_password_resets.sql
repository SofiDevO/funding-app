-- migrations/0004_add_password_resets.sql
-- Tokens de recuperacion de contraseña (donantes).
-- Spec: vault [[Backend Architecture#Password Recovery]] (envio con Resend, testing).
--
-- token_hash: SHA-256 hex del token — el token en claro viaja SOLO en
--             el link del email (/reset?token=...&email=...), nunca se
--             persiste. Comparar en tiempo constante.
-- expires_at: al crear, datetime('now', '+60 minutes').
-- used_at: NULL = pendiente; con valor = consumido (un token = un uso).
-- Alcance: solo users. El admin recupera re-ejecutando el seeder
-- (scripts/seed-admin.js).

CREATE TABLE password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
