export interface Donation{
    id:string;
    goalId:string;
    userName:string;
    userEmail:string;
    amount:number;
    message:string | null;
    paymentMethod: string;
    paymentId:string | null;
    status: "pending" |"completed" | "failed";
    createdAt:string;
};
export interface DonationCreate{
    goalId:string;
    userName:string;
    userEmail:string;
    amount:number;
};
