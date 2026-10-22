import type {TopContributor} from "../entities/top-contributor";

export interface StatsRepository{
    findContributor(): Promise<TopContributor | null>;
};
