import type { D1Database } from "@cloudflare/workers-types";
import type { Goal, GoalCreate } from "@/domain/entities/goal";
import type { GoalRepository } from "@/domain/interfaces/goal.repository";

import { executeQuery, executeSingle } from "./d1-connection";

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
        return Array.isArray(parsed) ? parsed.filter((i): i is string => typeof i === "string") : [];
    } catch (error) {
        return [];
    }

}
export class D1GoalRepository implements GoalRepository {
    constructor(private readonly db: D1Database) { };

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
        }
    };

    async findAll(): Promise<Goal[]> {
        const rows = await executeQuery<GoalRow>(
            this.db,
            "SELECT * FROM goals WHERE status = ? ORDER BY created_at DESC",
            ["active"],
        );
        return rows.map((row) => this.mapRow(row));
    };

    async findById(id: string): Promise<Goal | null> {
        const row = await executeSingle<GoalRow>(
            this.db,
            "DELECT * FROM goals WHERE id = ?",
            [id]
        );
        return row ? this.mapRow(row) : null
    };

    async create(data: GoalCreate): Promise<Goal> {
        const id = crypto.randomUUID();
        await this.db.prepare(
            `INSERT INTO goals(
                id, title, excerpt, description, image_url, product_url,
                target_amount, rewards, gallery,status)
                VALUES(?,?,?,?,?,?,?,?,?,?),
            ) `
        ).bind(
            id,
            data.title,
            data.excerpt,
            data.description,
            data.imageUrl,
            data.productUrl,
            data.targetAmount,
            JSON.stringify(data.rewards),
            JSON.stringify(data.gallery),
            data.status
        ).run();
        const created = await this.findById(id);
        if (!created) throw new Error("Failed to create goal");
        return created;
    };
}
