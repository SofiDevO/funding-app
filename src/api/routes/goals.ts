import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/types/env";
import { D1GoalRepository } from "@/infrastructure/database/goal.repository";
import { GetGoals } from "@/application/use-cases/goals/get";
import { GetGoalById } from "@/application/use-cases/goals/get-by-id";
import { BadRequestError, ConflictError, NotFoundError } from "../errors/http-error";

import { parseBody, parseParam } from "../middleware/validate";
import { goalSchema, goalUpdateSchema } from "../schemas/goal-schema";
import { CreateGoal } from "@/application/use-cases/goals/create";
import { requireAdmin } from "../middleware/auth";
import { updateGoal } from "@/application/use-cases/goals/update";
import { DeleteGoal } from "@/application/use-cases/goals/delete";
import { D1DonationRepository } from "@/infrastructure/database/donation.repository";

const goals = new Hono<AppEnv>();

// POST

goals.post("/", async (c) => {
  const body = await parseBody(c, goalSchema);

  const goal = await new CreateGoal(new D1GoalRepository(c.get("db"))).execute(
    body,
  );

  c.header("Location", `/api/goals/${goal.id}`);
  return c.json({ goal }, 201);
});

// PUT

goals.put("/:id", requireAdmin, async (c) => {
  const id = await parseParam(c, "id", z.uuid());
  const body = await parseBody(c, goalUpdateSchema);

  const goal = await new updateGoal(new D1GoalRepository(c.get("db"))).execute(
    id,
    body,
  );

  if (!goal) throw new NotFoundError("Goal not found");

  return c.json({ goal });
});

// DELETE

goals.delete('/:id',requireAdmin, async (c)=>{
  const id  = parseParam(c, "id", z.uuid());

  const result = await new DeleteGoal(
    new D1GoalRepository(c.get("db")),
    new D1DonationRepository(c.get("db"))
  ).execute(id);

  if(result === "not-found") throw new NotFoundError("Goal not fund");
  if(result === "has-donations") throw new ConflictError("Cant delete onation that has donations");
  return  c.body(null, 204);
});


// GET /api/goals

goals.get("/", async (c) => {
  const useCase = new GetGoals(new D1GoalRepository(c.get("db")));
  const list = await useCase.execute();
  c.header("Cache-Control", "public, max-age=30");
  return c.json({ goals: list });
});

// GET /api/goals/:id

goals.get("/:id", async (c) => {
  const id = parseParam(c, "id", z.uuid());
  const useCase = new GetGoalById(new D1GoalRepository(c.get("db")));
  const goal = await useCase.execute(id);

  if (!goal || goal.status === "draft") {
    throw new NotFoundError("Goal not found");
  }
  c.header("Cache-Control", "public, max-age=30");
  return c.json({ goal });
});

export default goals;
