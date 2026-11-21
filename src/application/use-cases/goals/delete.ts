import type { GoalRepository } from "@/domain/interfaces/goal.repository";
import type { DonationRepository } from "@/domain/interfaces/donation.repository";
import type { Donation } from "@/domain/entities/donation";

export type DeleteGoalResult = "deleted" | "not-found" | "has-donations";

export class DeleteGoal {
  constructor(
    private readonly goals: GoalRepository,
    private readonly donations: DonationRepository,
  ) {}

  async execute(id: string): Promise<DeleteGoalResult> {
    const existing = await this.goals.findById(id);
    if (!existing) return "not-found";

    const donations = await this.donations.findByGoalId(id);
    if (donations.length > 0) return "has-donations";

    await this.goals.delete(id);
    return "deleted";
  }
}
