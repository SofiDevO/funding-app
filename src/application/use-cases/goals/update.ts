import type { Goal, GoalCreate } from "@/domain/entities/goal";
import type { GoalRepository } from "@/domain/interfaces/goal.repository";

export class updateGoal {
  constructor(private readonly goals: GoalRepository) {}

  async execute(id: string, data: Partial<GoalCreate>): Promise<Goal | null> {
    const existing = await this.goals.findById(id);
    if (!existing) return null;
    await this.goals.update(id, data);
    return this.goals.findById(id);
  }
}
