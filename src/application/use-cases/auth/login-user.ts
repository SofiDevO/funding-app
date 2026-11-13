import type {AuthAccount, AuthRepository} from "@/domain/interfaces/auth.repository";
import type {PasswordHasher} from "@/domain/interfaces/password-hasher";

export type LoginResult = {kind: "ok"; account: AuthAccount} | {kind:"invalid"};

export class LoginUser{
    constructor(
        private readonly  auth:AuthRepository,
        private readonly  hasher:PasswordHasher,

    ){}
    async execute(input:{identifier:string,password:string}):Promise<LoginResult>{
        const account = await this.auth.findByIdentifier(input.identifier);
        if(!account) return {kind:"invalid"};
        const valid = await this.hasher.verify(input.password, account.passwordHash);
        if(!valid) return {kind:"invalid"};
        return {kind:"ok", account};
    }
};