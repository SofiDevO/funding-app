export interface PaymentProvider{

    createChekout(params:{
        goalId:string,
        amount:number,
        userName:string,
        userEmail:string,
        origin:string
    }):Promise<{sessionId:string, url:string}>

    // Verify Webhook authenticity

    verifyWebhook(body:string, signature:string):Promise<{
        goalId:string,
        userName:string,
        userEmail:string,
        amount:number,
        paymentId:string,
    }| null >
};