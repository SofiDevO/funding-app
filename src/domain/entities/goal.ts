
/**
 * Domain entity representing a fundraising goal.
 *
 * `productUrl` is nullable: it is `null` when the goal has no product URL
 * attached. `status` is the lifecycle value persisted in D1
 * (`'active' | 'draft' | 'completed' | 'paused'`).
 */
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

/**
 * Creation payload for a goal. `description` and `imageUrl` are required (they
 * map to `NOT NULL` D1 columns); `status` is optional and, when omitted, the
 * repository defaults it to `'draft'`, so the goal is created unpublished.
 * `productUrl` is optional and sets the product URL when provided.
 */
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
