import type {AuthAccount, AuthRepository} from "@/domain/interfaces/auth.repository";
import type {PasswordHasher} from "@/domain/interfaces/password-hasher";

export type LoginResult = {kind: "ok"; account: AuthAccount} | {kind:"invalid"};

export class LoginUser{
    constructor(){}
}