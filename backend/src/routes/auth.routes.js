import { Router } from "express";
import { loginValidator} from "../validators/auth.validator.js";
import { login, getMe, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import { credentialRateLimit, forgotPasswordRateLimit, loginRateLimit } from '../middlewares/rateLimit.js';


const authRouter = Router();



// POST api/auth/login
authRouter.post("/login", loginRateLimit, loginValidator, login);

authRouter.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);

authRouter.post("/reset-password/:token", credentialRateLimit, resetPassword);

authRouter.get("/get-me", verifyAuth, getMe);

export default authRouter;
