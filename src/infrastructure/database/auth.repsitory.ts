import type { D1Database } from "@cloudflare/workers-types";
import type { AuthAccount, AuthRepository } from "@/domain/interfaces/auth.repository";
import { executeSingle } from "./d1-connection";


export class D1AuthRepository implements AuthRepository{
    constructor(private readonly db: D1Database){};

    async findByIdentifier(identifier:string):Promise<AuthAccount | null>{
        const admin = await executeSingle<AuthAccount>(
            this.db,
            `SELECT id, email, username, password_hash AS passwordHash, NULL AS profilePicture, 'admin' AS role FROM admin WHERELOWER(email) = LOWER(?) OR username = ? LIMIT 1`,
            [identifier, identifier]
        );

        if(admin) return admin;
        return executeSingle<AuthAccount>(
            this.db,
            `SELECT id, email, username, password_hash AS passwordHash, profile_picture AS profilePicture, 'donor' AS role FROM users WHERE LOWER(email) = LOWER(?) OR username = ? LIMIT 1`,
            [identifier, identifier]
        );
    };

    async emailOrUserTaken(email:string, username:string):Promise<boolean>{
        const row = await executeSingle<{found:number}>(
            this.db,
            `SELECT 1 AS found FROM admin WHERE email = ?  OR username = ? UNION ALL SELECT 1 AS found FROM users WHERE email = ? OR username = ? LIMIT 1`,
            [email, username, email, username],
        );
        return row !== null;
    };

    async createDonor(data:{
        email:string,
        username:string,
        passwordHash:string
    }): Promise<AuthAccount>{
        const id  = crypto.randomUUID();
        await this.db.prepare(
            "INSERT INTO users(id, email,username, password_hash) VALUES(?,?,?,?)"
        ).bind(id, data.email, data.username, data.passwordHash).run();
        return {
            id,
            email:data.email,
            username:data.username,
            passwordHash:data.passwordHash,
            role: "donor",
            profilePicture: null
        }
    }
}