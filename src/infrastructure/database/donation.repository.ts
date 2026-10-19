import { D1Database } from "@cloudflare/workers-types";
import type { Donation, DonationCreate } from "@/domain/entities/donation";
import type { DonationRepository } from "@/domain/interfaces/donation.repository";
import { executeQuery, executeSingle } from "./d1-connection";

interface DonationRow {
  id: string;
  goal_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  message: string;
  payment_method: string;
  payment_id: string | null;
  status: Donation["status"];
  created_at: string;
}
export class D1DonationRepository implements DonationRepository {
  constructor(private readonly db: D1Database) {}

  private mapRow(row: DonationRow): Donation {
    return {
      id: row.id,
      goalId: row.goal_id,
      userName: row.user_name,
      userEmail: row.user_email,
      amount: row.amount,
      message: row.message,
      paymentMethod: row.payment_method,
      paymentId: row.payment_id,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  async findById(id: string): Promise<Donation | null> {
    const row = await executeSingle<DonationRow>(
      this.db,
      "SELECT * FROM donations WHERE  id = ?",
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  async findByGoalId(goalId: string): Promise<Donation[]> {
    const rows = await executeQuery<DonationRow>(
      this.db,
      "SELECT * FROM donations WHERE goal_id = ? ORDER BY created_at DESC",
      [goalId],
    );
    return rows.map((row) => this.mapRow(row));
  }

  async create(data: DonationCreate & { paymentId: string }): Promise<string> {
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `
            INSERT INTO  donations(id, goal_id, user_name, user_email, amount, payment_id, status)
            VALUES(?, ?, ?, ?, ?, ?, 'completed')
            ON CONFLICT(payment_id) DO NOTHING
        `,
      )
      .bind(
        id,
        data.goalId,
        data.userName,
        data.userEmail,
        data.amount,
        data.paymentId,
      )
      .run();
    return id;
  }

  async updateStatus(id: string, status: Donation["status"]): Promise<void> {
    await this.db
      .prepare("UPDATE donations SET status = ? WHERE id = ?")
      .bind(status, id)
      .run();
  }

  async saveMessage(id: string, message: string): Promise<void> {
    await this.db
      .prepare(`UPDATE donations SET message = ? WHERE id = ?`)
      .bind(message, id)
      .run();
  }

  async findMessage(
    limit: number = 50,
  ): Promise<Pick<Donation, "userName" | "message" | "createdAt">[]> {
    const rows = await executeQuery<DonationRow>(
      this.db,
      `SELECT user_name, message,created_at FROM donations WHERE message IS NOT NULL AND  message != '' AND status = 'completed' ORDER BY created_at DESC LIMIT ?`,
      [limit],
    )
    return rows.map((row) => ({
      userName: row.user_name,
      message: row.message,
      createdAt: row.created_at,
    }));
  }
}
