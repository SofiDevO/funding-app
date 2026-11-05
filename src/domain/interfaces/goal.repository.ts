import type { Goal, GoalCreate } from "../entities/goal";

/**
 * Persistence contract for the `Goal` aggregate in the onion architecture.
 *
 * Sits at the innermost (domain) layer — it has zero knowledge of the
 * underlying storage engine. The concrete implementation (`D1GoalRepository`
 * in `src/infrastructure/database/goal.repository.ts`) talks to Cloudflare D1
 * (SQLite on the edge) via `c.get('db')` (Hono DI, injected in `src/fetch.ts`).
 *
 * All IDs are UUID v4 strings generated with `crypto.randomUUID()`.
 * `create` generates the UUID **internally** and returns the hydrated
 * {@link Goal}; the caller passes a {@link GoalCreate} (which has no `id`
 * field). D1 has no native UUID function.
 *
 * @example
 * ```ts
 * // Use case receiving the interface via constructor injection (Guide 04)
 * import type { GoalRepository } from "../interfaces/goal.repository";
 *
 * export class GetGoals {
 *   constructor(private readonly goals: GoalRepository) {}
 *
 *   async execute(): Promise<Goal[]> {
 *     return this.goals.findAll();
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // Hono route wiring the D1 implementation (src/api/routes/goals.ts)
 * import { Hono } from "hono";
 * import type { AppEnv } from "../../types/env";
 * import { D1GoalRepository } from "../../infrastructure/database/goal.repository";
 * import { GetGoals } from "../../application/use-cases/goals/get";
 *
 * const goals = new Hono<AppEnv>();
 *
 * goals.get("/", async (c) => {
 *   const repo = new D1GoalRepository(c.get("db"));
 *   const useCase = new GetGoals(repo);
 *   return c.json(await useCase.execute());
 * });
 *
 * export default goals;
 * ```
 */
export interface GoalRepository {

    /**
     * Returns all goals with `status = 'active'` from the D1 `goals` table.
     *
     * Draft, completed, and paused goals are **excluded** by the implementation
     * (`WHERE status = 'active'`). A goal starts as `'draft'`: the repository
     * sends `"draft"` when the field is omitted (an explicit `NULL` does not
     * trigger the D1 column `DEFAULT`, and the `CHECK (status IN (...))` does
     * not reject `NULL` — it only fails on `false`), and becomes active only
     * after the admin publishes it via `PUT /api/goals/:id`.
     *
     * @returns A promise that resolves to an array of {@link Goal} entities.
     *          Returns `[]` when no active goals exist — never `null`.
     *
     * @example
     * ```ts
     * // D1 query executed by D1GoalRepository
     * // SELECT * FROM goals WHERE status = 'active'
     * const active = await repo.findAll();
     * // active: Goal[]  (drafts excluded)
     * ```
     */
    findAll(): Promise<Goal[]>;

    /**
     * Finds a single goal by its UUID v4 identifier regardless of its `status`.
     *
     * Used by the checkout flow to validate `status = 'active'` before
     * creating a Lemon Squeezy order, and by `GET /api/goals/:id` to render
     * the goal detail page (`src/pages/goals/[id].astro`).
     *
     * @param id - UUID v4 string (`TEXT PRIMARY KEY` in D1, validated with
     *             `z.uuid()` at the API layer before reaching this method).
     * @returns A promise that resolves to the matching {@link Goal}, or `null`
     *          if no row with the given `id` exists in D1.
     *
     * @example
     * ```ts
     * // D1 query executed by D1GoalRepository
     * // SELECT * FROM goals WHERE id = ?
     * const goal = await repo.findById("550e8400-e29b-41d4-a716-446655440000");
     * if (!goal) return c.json({ error: "Not Found" }, 404);
     * if (goal.status !== "active") return c.json({ error: "Goal not available" }, 400);
     * ```
     */
    findById(id: string): Promise<Goal | null>;

    /**
     * Inserts a new row in the D1 `goals` table and returns the hydrated entity.
     *
     * The repository generates the UUID v4 internally with `crypto.randomUUID()`
     * and returns the hydrated {@link Goal}; the caller passes a {@link GoalCreate}
     * (which has no `id` field). D1 has no native UUID function.
     *
     * Fields `description` and `imageUrl` map to `NOT NULL` D1 columns and must
     * always be present in `data`. When `status` is omitted, the repository sends
     * `"draft"`: an explicit `NULL` does not trigger the D1 column `DEFAULT`, and
     * the `CHECK (status IN (...))` does not reject `NULL` (it only fails on
     * `false`). The goal is created unpublished and invisible to donators until
     * the admin activates it with `PUT /api/goals/:id`.
     *
     * Serialization of JSON columns is handled by the infrastructure layer:
     * - `rewards: string[]` → `JSON.stringify` before `INSERT`, `JSON.parse` after `SELECT`
     * - `gallery: string[]` → same pattern; stored as `NULL` when `undefined`
     *
     * @param data - Validated creation payload conforming to {@link GoalCreate}.
     *               Zod schema: `goalSchema` in `src/api/schemas/goal-schema.ts`.
     * @returns A promise that resolves to the newly created {@link Goal} with
     *          all fields populated, including the repository-generated `id` and
     *          the D1-generated `createdAt`/`updatedAt`.
     *
     * @example
     * ```ts
     * // The repository generates the UUID internally
     * const goal = await repo.create({
     *   title: "New Microphone",
     *   excerpt: "Help me get a better microphone for streams.",
     *   description: "Full description shown on the goal detail page.",
     *   imageUrl: "https://funding-app-bucket.sofidev.top/images/mic.webp",
     *   targetAmount: 150,      // USD units, REAL in D1
     *   rewards: ["Mention on stream", "Sticker pack"],
     *   // status omitted → repository defaults to "draft"
     * });
     * console.log(goal.id);     // generated by the repository
     * console.log(goal.status); // "draft"
     * ```
     */
    create(data: GoalCreate): Promise<Goal>;

    /**
     * Increments `goals.current_amount` by `amount` for the given goal ID.
     *
     * This method is called exclusively from the Lemon Squeezy webhook handler
     * (`POST /api/webhooks/lemonsqueezy`, in `src/api/routes/webhooks.ts`) after
     * an `order_created` event with `status: 'paid'` is verified and the
     * `custom_data.goalId` branch is taken.
     *
     * The credited amount is **not** the raw `order.total` from Lemon Squeezy
     * when the donor opted to cover fees — it is:
     * ```
     * credited = custom_data.intendedAmount ?? order.total
     * ```
     * Both values are in **USD units** (e.g. `10` = $10.00), matching the `REAL`
     * type of `goals.current_amount` and `goals.target_amount` in D1.
     *
     * The D1 implementation executes an atomic `UPDATE`:
     * ```sql
     * UPDATE goals SET current_amount = current_amount + ?, updated_at = datetime('now')
     * WHERE id = ?
     * ```
     *
     * @param id - UUID v4 string identifying the target goal row in D1.
     * @param amount - Positive USD amount to add to `current_amount`.
     *                 Comes from `credited` in the webhook handler.
     * @returns A promise that resolves to `void` on success. To read the
     *          updated value, call {@link findById} after this resolves.
     *
     * @example
     * ```ts
     * // Inside the Lemon Squeezy webhook handler (goalId branch):
     * const intendedAmount = payload.meta.custom_data?.intendedAmount;
     * const credited = intendedAmount ?? payload.data.attributes.total;
     *
     * await repo.updateProgress(custom_data.goalId, credited);
     *
     * // Broadcast the updated amount to OBS via WebSocket (event: "donation")
     * broadcast({ id: donationId, userName, amount: credited, goal: { id, title } });
     * ```
     */
    updateProgress(id: string, amount: number): Promise<void>;

    /**
     * Partially updates the goal fields present in `data`.
     *
     * The implementation maps the present keys through the column whitelist
     * (`GOAL_COLUMNS` in `src/infrastructure/database/goal.repository.ts`) and
     * builds a dynamic `UPDATE goals SET ... WHERE id = ?`. Keys whose value is
     * `undefined` are skipped, so only the fields sent by the caller are
     * touched — an update without `status` keeps the current status.
     *
     * This method does **not** check whether the row exists: the use case must
     * read the goal first (via {@link findById}) and decide the 404 before
     * updating. The `status` field is part of the update payload, so an admin
     * can publish a draft with `PUT /api/goals/:id` carrying
     * `{ "status": "active" }`.
     *
     * @param id - UUID v4 string identifying the target goal row in D1.
     * @param data - Partial creation payload conforming to {@link GoalCreate}.
     * @returns A promise that resolves to `void` on success. To read the
     *          updated value, call {@link findById} after this resolves.
     *
     * @example
     * ```ts
     * // Partial update: only the title changes; status is untouched.
     * await repo.update("550e8400-e29b-41d4-a716-446655440000", {
     *   title: "New Microphone",
     * });
     * ```
     */
    update(id:string, data:Partial<GoalCreate>):Promise<void>;

    /**
     * Deletes the goal row identified by `id`.
     *
     * The goal must not have donations when this runs: the
     * `donations.goal_id` foreign key has no `ON DELETE CASCADE`, so the use
     * case must check for existing donations first (via
     * `DonationRepository.findByGoalId`) and translate that into a `409
     * Conflict` before deleting.
     *
     * @param id - UUID v4 string identifying the target goal row in D1.
     * @returns A promise that resolves to `void` on success.
     */
    delete(id:string):Promise<void>;
}