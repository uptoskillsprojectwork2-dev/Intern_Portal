import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";
import logAction from "../utils/logAction.js";
import { logAudit } from "../utils/auditLogger.js";

dotenv.config();

export async function login(req, res) {
    const { email, password, internCode } = req.body;
    const secret = password || internCode;

    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
        await logAction({
            req,
            action: 'LOGIN_FAILED',
            targetType: 'User',
            meta: { email }
        });
        await logAudit({ action: 'LOGIN_FAILURE', targetType: 'Authentication', meta: { email }, req });
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    if (user.isArchived) {
        await logAction({
            req,
            action: 'LOGIN_FAILED',
            targetType: 'User',
            targetId: user._id,
            meta: { email, reason: 'archived' }
        });
        await logAudit({ actor: user, action: 'LOGIN_BLOCKED_ARCHIVED', targetType: 'Authentication', targetId: user._id, req });
        return res.status(403).json({
            message: user.role === "intern"
                ? "Your internship account has been archived. Contact admin."
                : "Account is archived. Please contact administrator."
        });
    }

    let isCredentialValid = false;

    if (user.role === 'intern') {
        const hasPassword = Boolean(user.password && user.passwordSetAt);
        if (hasPassword) {
            isCredentialValid = await user.comparePassword(secret);
        } else if (user.password) {
            const bcryptMatch = await user.comparePassword(secret);
            isCredentialValid = bcryptMatch || Boolean(user.internCode && secret === user.internCode);
        } else {
            isCredentialValid = Boolean(user.internCode && secret === user.internCode);
        }
    } else {
        isCredentialValid = await user.comparePassword(secret);
    }

    if (!isCredentialValid) {
        await logAction({
            req,
            action: 'LOGIN_FAILED',
            targetType: 'User',
            targetId: user._id,
            meta: { email }
        });
        await logAudit({ action: 'LOGIN_FAILURE', targetType: 'Authentication', meta: { email }, req });
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

    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await logAction({
        req,
        actor: user,
        action: 'LOGIN',
        targetType: 'User',
        targetId: user._id,
        meta: { email: user.email }
    });
    await logAudit({ actor: user, action: 'LOGIN_SUCCESS', targetType: 'Authentication', targetId: user._id, req });

    return res.status(200).json({
        message: "User logged in successfully",
        token,
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNo: user.mobileNo,
            role: user.role,
            createdAt: user.createdAt,
            passwordSetAt: user.passwordSetAt
        }
    });
}

export async function logout(req, res) {
    if (req.user) {
        await logAction({
            req,
            actor: req.user,
            action: 'LOGOUT',
            targetType: 'User',
            targetId: req.user.id
        });
    }
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    });
    return res.status(200).json({
        message: 'Logged out successfully'
    });
}

export async function getMe(req, res) {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        return res.status(200).json({
            user
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
}

export async function forgotPassword(req, res) {
    const { email } = req.body;

    const genericMessage = "If an account with that email exists, a password reset link has been sent.";

    try {
        const user = await User.findOne({ email: email?.toLowerCase() });

        if (!user) {
            await logAudit({ action: 'PASSWORD_RESET_ATTEMPT_UNKNOWN_EMAIL', targetType: 'Authentication', meta: { email }, req });
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

        await logAction({
            req,
            action: 'PASSWORD_RESET_REQUESTED',
            targetType: 'User',
            targetId: user._id,
            meta: { email: user.email }
        });
        await logAudit({ actor: user, action: 'PASSWORD_RESET_REQUESTED', targetType: 'Authentication', targetId: user._id, req });

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

    if (typeof newPassword !== "string" || newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({
            message: "New password must be at least 8 characters long and contain at least one letter and one number"
        });
    }

    try {
        const hashedToken = createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            await logAudit({ action: 'PASSWORD_RESET_FAILED', targetType: 'Authentication', req });
            return res.status(400).json({
                message: "Reset link is invalid or has expired"
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordSetAt = new Date();
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await logAction({
            req,
            action: 'PASSWORD_RESET_COMPLETED',
            targetType: 'User',
            targetId: user._id,
            meta: { email: user.email }
        });
        await logAudit({ actor: user, action: 'PASSWORD_RESET_COMPLETED', targetType: 'Authentication', targetId: user._id, req });

        return res.status(200).json({
            message: "Password reset successful. You can now log in."
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
}
