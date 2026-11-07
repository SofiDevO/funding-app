export type AccountRole = "admin" | "donor";
export interface AuthAccount{
    id: string;
    email: string;
    username:string;
    passwordHash: string;
    role: AccountRole;
    profilePicture:string | null;
}
export interface AuthRepository{
    findByIdentifier(identifier: string): Promise<AuthAccount | null>;

    emailOrUsernameTaken(email:string, username:string):Promise<boolean>;
    createDonor(data:{
        email:string,
        username:string,
        passwordHash:string
    }): Promise<AuthAccount>;
}