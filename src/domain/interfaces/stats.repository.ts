import type {TopContributor} from "../entities/top-contributor";
export interface StatsRepository{
    findTopContributor(): Promise<TopContributor | null>;
};
