import {z} from "zod";

export const loginSchema = z.object({
    identifier: z.string().trim().min(3).max(255),
    password: z.string().min(8).max(128),
});


export const registerSchema = z.object({
    username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/, "Just letters, numbers, and _.- are allowed"),
    email:z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(8).max(128),
})