import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config()

<<<<<<< HEAD
export async function createIntern(req, res) {
    try {
        // Intern codes are used as initial passwords and hashed by the User model.
        const {
            fullName,
            email,
            mobileNo,
            internCode,
            domain,
            startDate,
            endDate,
            role
        } = req.body;

        const isUserExists = await userModel.findOne({ email });

        if (isUserExists) {
            return res.status(409).json({
                message: "user already exists"
            })
        };

        const user = await userModel.create({
            fullName,
            email,
            mobileNo,
            internCode,
            domain,
            startDate,
            endDate,
            role: role || "intern",
            password: internCode
        });


        res.status(200).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                email: user.email
            }
        })
    } catch (err) {
        res.status(500).json({
            message: "internal server error",
        })

    }
}

export async function createTeamLeader(req, res) {
    try {
        // Team leader passwords are hashed by the User model before persistence.
        const {
            fullName,
            email,
            mobileNo,
            startDate,
            endDate,
            password,
            role
        } = req.body;

        const isUserExists = await userModel.findOne({ email });

        if (isUserExists) {
            return res.status(409).json({
                message: "user already exists"
            });
        }

        const user = await userModel.create({
            fullName,
            email,
            mobileNo,
            startDate,
            endDate,
            role: role || "teamleader",
            password
        });

        const token = jwt.sign({
            id: user._id,
            email: email
        }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token);

        res.status(201).json({
            message: "Team leader created successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({
            message: "internal server error"
        })
    }
}

=======
>>>>>>> origin/main
export async function login(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(401).json({
            message: "Invalid credentials"
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