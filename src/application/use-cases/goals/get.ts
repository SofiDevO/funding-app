import type {Goal} from "@/domain/entities/goal";
import type {GoalRepository} from "@/domain/interfaces/goal.repository";


export class GetGoals {
    constructor(private readonly goals: GoalRepository){};


async execute():Promise<Goal[]>{
    return this.goals.findAll();
}
}