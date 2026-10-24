import type { D1Database } from "@cloudflare/workers-types";
import type { TopContributor } from "@/domain/entities/top-contributor";
import type { StatsRepository } from "@/domain/interfaces/stats.repository";
import { executeSingle } from "./d1-connection";

interface TopContributorRow {
  user_name: string;
  profile_picture: string;
  total: number;
  donation_count: number;
  last_donation_at: string;
}

export class D1StatsRepository implements StatsRepository {
  constructor(private readonly db: D1Database) {}

  async findTopContributor(): Promise<TopContributor | null> {
    const row = await executeSingle<TopContributor>(
      this.db,
      `
                WITH completed AS(
                    SELECT
                        LOWER(TRIM(user_email)) AS donor_key,
                        user_name,
                        amount,
                        created_at
                        FROM donations
                        WHERE status = 'completed'
                ),
                totals AS (
                    SELECT
                        donor_key,
                        ROUND(SUM(amount), 2) AS total,
                        COUNT(*)      AS donation_count,
                        MAX(created_at) AS last_donation_at
                    FROM completed
                    GROUP BY donor_key
                ),
                latest AS (
                    SELECT
                        donor_key,
                        user_name,
                        ROW_NUMBER() OVER (
                            PARTITION BY donor_key
                            ORDER BY created_at DESC
                        ) AS rn
                    FROM completed
                )
                where RN = 1
            )
            SELECT
                COALESCE(u.username, l.username) AS user_name,
                u.profile_picture,
                t.total,
                t.donation_count,
                t.last_donation_at
            FROM totals t
            JOIN latest l ON l.donor_key = t.donor_key
            LEFT JOIN users u ON LOWER(u.email) = t.donor_key
            ORDER BY t.total DESC, t.donation_count DESC, t.last_donation_at ASC
            LIMIT 1
            `,
    );

    if (!row) return null;

    return {
      userName: row.userName,
      profilePicture: row.profilePicture,
      total: row.total,
      donationCount: row.donationCount,
      lastDonation: row.lastDonation,
    };
  }
}
