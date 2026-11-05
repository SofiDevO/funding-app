import type {Goal} from "@/domain/entities/goal";
import type {GoalRepository} from "@/domain/interfaces/goal.repository";

export class GetGoalById{
constructor(private readonly goals:GoalRepository){};

    async xecute(id:string):Promise<Goal | null>{
        return this.goals.findById(id);
    }
};
