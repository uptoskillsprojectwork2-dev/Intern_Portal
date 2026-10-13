import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config()

export async function login(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    if (user.isArchived) {
        return res.status(403).json({
            message: "Your internship account has been archived. Contact admin."
        });
    }

    // Compare the plain-text request password with the stored bcrypt hash.
    const isCredentialValid = await user.comparePassword(password);

    if (!isCredentialValid) {
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    // The frontend uses the returned role to select the correct dashboard.
    const token = jwt.sign({
        id: user._id,
        email: user.email,
        role: user.role
    }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token);

    return res.status(200).json({
        message: "User logged in successfully",
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNo: user.mobileNo,
            role: user.role,
            createdAt: user.createdAt
        }
    });
}

export async function getMe(req, res) {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('fullName email mobileNo role createdAt');

        if (!user) {
            return res.status(404).json({
                message: "user not found"
            })
        }

        res.status(200).json({
            message: "user found",
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNo: user.mobileNo,
            role: user.role,
            createdAt: user.createdAt
        })
    } catch (err) {
        res.status(500).json({
            message: "internal server error"
        })
    }
}

export async function forgotPassword(req, res) {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
            message: "Email is required"
        });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        const genericMessage = "If an account with this email exists, a reset link has been sent.";

        if (!user) {
            return res.status(200).json({ message: genericMessage });
        }

        const rawToken = randomBytes(32).toString("hex");
        const hashedToken = createHash("sha256").update(rawToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

        await sendEmail({
            to: user.email,
            subject: "Reset your UPTOSKILL password",
            html: `<p>Click the link below to reset your password:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>This link expires in 15 minutes.</p>`
        });

        return res.status(200).json({ message: genericMessage });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
}

export async function resetPassword(req, res) {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({
            message: "New password must be at least 8 characters long"
        });
    }

    try {
        const hashedToken = createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Reset link is invalid or has expired"
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(200).json({
            message: "Password reset successful. You can now log in."
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
}