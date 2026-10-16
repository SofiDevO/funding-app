import type { D1Database } from "@cloudflare/workers-types";
import type { Goal, GoalCreate } from "../../domain/entities/goal";
import type { GoalRepository } from "../../domain/interfaces/goal.repository";
import { executeQuery, executeSingle } from "./d1-connection";

/**
 * Column whitelist for partial `UPDATE`: maps each updatable domain field to
 * its D1 column and, when needed, the serializer that converts a domain value
 * to its stored form. Column names come from here, never from the request body.
 */
const GOAL_COLUMNS: Record<
  keyof GoalCreate,
  { column: string; serialize?: (value: unknown) => unknown }
> = {
  title: { column: "title" },
  excerpt: { column: "excerpt" },
  description: { column: "description" },
  imageUrl: { column: "image_url" },
  productUrl: { column: "product_url", serialize: (value) => value ?? null },
  targetAmount: { column: "target_amount" },
  rewards: { column: "rewards", serialize: (value) => JSON.stringify(value) },
  gallery: { column: "gallery", serialize: (value) => JSON.stringify(value) },
  status: { column: "status" },
};

interface GoalRow {
  id: string;
  title: string;
  excerpt: string;
  description: string;
  image_url: string;
  product_url: string | null;
  target_amount: number;
  current_amount: number;
  rewards: string | null;
  gallery: string | null;
  status: Goal["status"];
  created_at: string;
  updated_at: string;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((i): i is string => typeof i === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * D1 implementation of `GoalRepository`.
 *
 * Translates `snake_case` rows to `camelCase` entities in `mapRow`
 * and serializes `rewards`/`gallery` as JSON text. Method contracts
 * are documented in the `GoalRepository` interface.
 */
export class D1GoalRepository implements GoalRepository {
  constructor(private readonly db: D1Database) {}

  private mapRow(row: GoalRow): Goal {
    return {
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      description: row.description,
      imageUrl: row.image_url,
      productUrl: row.product_url,
      targetAmount: row.target_amount,
      currentAmount: row.current_amount,
      rewards: parseJsonArray(row.rewards),
      gallery: parseJsonArray(row.gallery),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll(): Promise<Goal[]> {
    const rows = await executeQuery<GoalRow>(
      this.db,
      "SELECT * FROM goals WHERE status = ? ORDER BY created_at DESC",
      ["active"],
    );
    return rows.map((row) => this.mapRow(row));
  }

  async findById(id: string): Promise<Goal | null> {
    const row = await executeSingle<GoalRow>(
      this.db,
      "SELECT * FROM goals WHERE id = ?",
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  async create(data: GoalCreate): Promise<Goal> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO goals
           (id, title, excerpt, description, image_url, product_url,
            target_amount, rewards, gallery, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        data.title,
        data.excerpt,
        data.description,
        data.imageUrl,
        data.productUrl ?? null,
        data.targetAmount,
        JSON.stringify(data.rewards ?? []),
        data.gallery ? JSON.stringify(data.gallery) : null,
        data.status ?? null,
      )
      .run();

    const created = await this.findById(id);
    if (!created)
      throw new Error("Goal creation failed: row not found after INSERT");
    return created;
  }

  async updateProgress(id: string, amount: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE goals
         SET current_amount = current_amount + ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(amount, id)
      .run();
  }

  async update(id: string, data: Partial<GoalCreate>): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, spec] of Object.entries(GOAL_COLUMNS)) {
      const value = data[key as keyof GoalCreate];
      if (value === undefined) continue;

      sets.push(`${spec.column} = ?`);
      values.push(spec.serialize ? spec.serialize(value) : value);
    }

    if (sets.length === 0) return;

    await this.db
      .prepare(
        `UPDATE goals SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(...values, id)
      .run();
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM goals WHERE id = ?").bind(id).run();
  }
}
