import { z } from "zod";

export const goalSchema = z.object({
  title: z.string().trim().min(3).max(255),
  excerpt: z.string().trim().min(10).max(160),
  description: z.string().trim().min(10).max(2000),
  imageUrl: z.url(),
  productUrl: z.url().optional(),
  targetAmount: z.number().positive().max(1_000_000),
  rewards: z.array(z.string().trim().min(1).max(255)).max(20).optional(),
  gallery: z.array(z.url()).max(10).optional(),
  status: z.enum(["active", "draft", "completed", "paused"]).optional(),
});

export const goalUpdateSchema = goalSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { error: "Envia al menos un campo para actualizar" },
);
