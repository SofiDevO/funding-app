import { z } from "zod";

export const loginSchema = z.object({
  // Acepta email o username: no se valida como email a proposito.
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Solo letras, numeros, punto, guion y guion bajo"),
  // trim y toLowerCase ANTES de validar: z.email() valida el valor
  // tal como llega, asi que un email con espacios fallaria.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
});
