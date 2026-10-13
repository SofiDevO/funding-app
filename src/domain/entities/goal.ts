
export interface Goal{
    id:string;
    title:string;
    excerpt:string;
    description:string;
    imageUrl:string;
    productUrl: string | null;
    targetAmount: number;
    currentAmount: number;
    rewards:string[];
    gallery:string[];
    status: "active" | "draft" | "completed" |"paused";
    createdAt:string;
    updatedAt:string;
};

export interface GoalCreate {
    title:string;
    excerpt:string;
    description:string;
    imageUrl:string;
    productUrl?:string;
    targetAmount:number;
    rewards?: string[];
    gallery?:string[];
    status?:Goal["status"];
};
