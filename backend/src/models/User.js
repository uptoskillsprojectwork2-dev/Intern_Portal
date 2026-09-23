import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        mobileNo: {
            type: String
        },

        internCode: {
            type: String,
            unique: true,
            sparse: true
        },

        domain: {
            type: String
        },

        startDate: {
            type: Date
        },

        endDate: {
            type: Date
        },

        password: {
            type: String,
            required: function () {
                return !this.internCode;
            }
        },

        resetPasswordToken: {
            type: String
        },

        resetPasswordExpires: {
            type: Date
        },

        role: {
            type: String,
            enum: ["admin", "intern", "teamleader"],
            default: "intern"
        },
        internshipDetails:{
            teamleaderEmail: { type: String, trim: true, lowercase: true },
            status: {
                type: String,
                enum: ["upcoming", "ongoing", "completed", "cancelled"],
                default: "upcoming"
            },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            createdAt: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true
    });


userSchema.methods.comparePassword = async function (candidatePassword) {

    return bcrypt.compare(
        candidatePassword,
        this.password
    );

};

userSchema.pre("save", async function (next) {
    if (!this.internCode) {
        this.internCode = this.email
    }

    if (!this.isModified("password")) {
        return;
    }

    // Never store a plain-text password or intern code.
    if (!/^\$2[aby]\$\d{2}\$/.test(this.password)) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next;
});

const userModel = mongoose.model(
    "user",
    userSchema
);

export default userModel;
