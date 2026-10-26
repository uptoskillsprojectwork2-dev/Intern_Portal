import { Router } from "express";
import { loginValidator } from "../validators/auth.validator.js";
import { login, getMe, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter
} from "../middlewares/rateLimiters.js";

const authRouter = Router();

// POST api/auth/login (Rate limited: 5 attempts per 15 minutes per IP and email)
authRouter.post("/login", loginRateLimiter, loginValidator, login);

// POST api/auth/forgot-password (Rate limited: 3 attempts per hour per IP and email)
authRouter.post("/forgot-password", forgotPasswordRateLimiter, forgotPassword);

// POST api/auth/reset-password/:token (Rate limited: 5 attempts per 15 minutes)
authRouter.post("/reset-password/:token", resetPasswordRateLimiter, resetPassword);

// POST api/auth/set-password/:token (Alias, rate limited: 5 attempts per 15 minutes)
authRouter.post("/set-password/:token", resetPasswordRateLimiter, resetPassword);

authRouter.get("/get-me", verifyAuth, getMe);

export default authRouter;