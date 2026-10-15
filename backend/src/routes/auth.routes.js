import { Router } from "express";
import { loginValidator } from "../validators/auth.validator.js";
import {
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";

const authRouter = Router();

// POST api/auth/login
authRouter.post("/login", loginValidator, login);

// POST api/auth/logout
authRouter.post("/logout", verifyAuth, logout);

authRouter.post("/forgot-password", forgotPassword);

authRouter.post("/reset-password/:token", resetPassword);

authRouter.get("/get-me", verifyAuth, getMe);

export default authRouter;