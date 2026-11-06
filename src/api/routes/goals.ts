import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "@/types/env";
import { D1GoalRepository } from "@/infrastructure/database/goal.repository";
import { GetGoals } from "@/application/use-cases/goals/get";
import { GetGoalById } from "@/application/use-cases/goals/get-by-id";
import { BadRequestError, NotFoundError } from "../errors/http-error";

import { parseParam } from "../middleware/validate";

const goals = new Hono<AppEnv>();

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

  if(!goal || goal.status === "draft"){
    throw new NotFoundError("Goal not found");
  }
  c.header("Cache-Control", "public, max-age=30");
  return c.json({ goal });
});


export default goals;