import { Router } from "express";
import jwt from "jsonwebtoken";
import { loginValidator } from "../validators/auth.validator.js";
import { login, logout, getMe, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";

const authRouter = Router();

const optionalAuth = (req, res, next) => {
    try {
        let token = req.cookies?.token;
        if (!token && req.headers?.authorization) {
            const parts = req.headers.authorization.split(" ");
            if (parts.length === 2 && parts[0] === "Bearer") {
                token = parts[1];
            }
        }
        if (token) {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        }
    } catch {
        // Safe disposal if token expired
    }
    next();
};

// POST api/auth/login
authRouter.post("/login", loginValidator, login);

authRouter.post("/logout", optionalAuth, logout);

authRouter.post("/forgot-password", forgotPassword);

authRouter.post("/reset-password/:token", resetPassword);

authRouter.get("/get-me", verifyAuth, getMe);

export default authRouter;