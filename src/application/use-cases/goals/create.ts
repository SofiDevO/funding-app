import type { Goal, GoalCreate } from "@/domain/entities/goal";
import type { GoalRepository } from "@/domain/interfaces/goal.repository";


export class CreateGoal {
    constructor(private readonly goals: GoalRepository){};

    async execute(data:GoalCreate):Promise<Goal>{
        return this.goals.create(data);
    }
};