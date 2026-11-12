import type {
  AuthAccount,
  AuthRepository,
} from "@/domain/interfaces/auth.repository";
import type { PasswordHasher } from "@/domain/interfaces/password-hasher";

export type RegisterResult =
  | { kind: "created"; account: AuthAccount }
  | { kind: "taken" };

export class RegisterDonor {
  constructor(
    private readonly auth: AuthRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: {
    email: string;
    username: string;
    password: string;
  }): Promise<RegisterResult> {
    if (await this.auth.emailOrUsernameTaken(input.email, input.username)) {
      return { kind: "taken" };
    }
    const passwordHash = await this.hasher.hash(input.password);
    const account = await this.auth.createDonor({
      email: input.email,
      username: input.username,
      passwordHash,
    });
    return { kind: "created", account };
  }
}
