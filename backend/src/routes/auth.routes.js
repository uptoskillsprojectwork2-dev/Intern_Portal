<<<<<<< HEAD
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
=======
import { Router } from "express";
import { loginValidator} from "../validators/auth.validator.js";
import { login, getMe, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";

>>>>>>> origin/main

const router = express.Router();

<<<<<<< HEAD
router.post('/register', async (req, res) => {
  try {
    const { fullName, name, email, password, role } = req.body;
    const user = await User.create({
      fullName: fullName || name,
      email,
      password,
      role: role || 'admin'
    });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
=======

>>>>>>> origin/main

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

<<<<<<< HEAD
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '1d' }
    );
    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
=======
authRouter.post("/forgot-password", forgotPassword);

authRouter.post("/reset-password/:token", resetPassword);

authRouter.get("/get-me", verifyAuth, getMe);
>>>>>>> origin/main

export default router;