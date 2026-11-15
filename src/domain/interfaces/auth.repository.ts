/** Roles supported by persisted authentication accounts. */
export type AccountRole = "admin" | "donor";

/**
 * Authentication data required to verify credentials and establish a session.
 *
 * This is an internal domain model, not an API response DTO. In particular,
 * `passwordHash` must never be exposed to a client.
 */
export interface AuthAccount{
    /** Stable account identifier used by the authentication system. */
    id: string;
    /** Account email address. */
    email: string;
    /** Account's public username and supported login identifier. */
    username:string;
    /** Stored password hash; this value is not the plaintext password. */
    passwordHash: string;
    /** Account role used to authorize access to protected operations. */
    role: AccountRole;
    /** Public profile image URL, or `null` when the account has no image. */
    profilePicture:string | null;
}

/**
 * Persistence contract for authentication accounts.
 *
 * Implementations may combine records from multiple account stores, but must
 * return a consistent {@link AuthAccount} model to the application layer.
 * Donor creation accepts a password hash so credential hashing remains the
 * responsibility of the application use case and its `PasswordHasher`.
 *
 * @example
 * ```ts
 * const account = await authRepository.findByIdentifier("sofi@example.com");
 * if (!account) return { kind: "invalid" };
 *
 * const passwordHash = await passwordHasher.hash(input.password);
 * const donor = await authRepository.createDonor({
 *   email: input.email,
 *   username: input.username,
 *   passwordHash,
 * });
 * ```
 */
export interface AuthRepository{
    /**
     * Finds an account by one of its supported login identifiers.
     *
     * @param identifier - The account email address or username to look up.
     * @returns The matching account, or `null` when no account matches.
     */
    findByIdentifier(identifier: string): Promise<AuthAccount | null>;

    /**
     * Checks whether either proposed donor identifier is already in use.
     *
     * @param email - Email address to check for an existing account.
     * @param username - Username to check for an existing account.
     * @returns `true` if the email or username is taken; otherwise, `false`.
     */
    emailOrUsernameTaken(email:string, username:string):Promise<boolean>;

    /**
     * Persists a donor account using a password hash produced by a password hasher.
     *
     * The input must contain the hash, not the user's plaintext password.
     * Call {@link emailOrUsernameTaken} as part of the registration flow before
     * creating the account; implementations may still enforce uniqueness in
     * their persistence layer.
     *
     * @param data - Donor email, username, and precomputed password hash.
     * @returns The newly created account with its generated identifier and donor role.
     *
     * @example
     * ```ts
     * const passwordHash = await passwordHasher.hash(password);
     * const account = await authRepository.createDonor({
     *   email,
     *   username,
     *   passwordHash,
     * });
     * ```
     */
    createDonor(data:{
        email:string,
        username:string,
        passwordHash:string
    }): Promise<AuthAccount>;
}