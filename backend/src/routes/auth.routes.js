import { Router } from "express";
import { loginValidator, registerValidator, teamLeaderValidator } from "../validators/auth.validator.js";
import { createIntern, createTeamLeader, login, getMe } from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const authRouter = Router();

// POST api/auth/register-intern
authRouter.post("/register-intern", verifyAuth, requireAdmin, registerValidator, createIntern);

// POST api/auth/register-tl
authRouter.post("/register-tl", verifyAuth, requireAdmin, teamLeaderValidator, createTeamLeader);

// POST api/auth/login
authRouter.post("/login", loginValidator, login);

authRouter.get("/get-me", verifyAuth, getMe);

export default authRouter;