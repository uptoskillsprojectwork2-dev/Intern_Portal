import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
{
    fullName: {
        type: String
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
        unique: true
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
        required: true
    },

    role: {
        type: String,
        enum: ["admin", "intern", "teamleader"],
        default: "intern"
    }
},
{
    timestamps: true
});

userSchema.pre("save", async function () {

    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(
        this.password,
        salt
    );
});

userSchema.methods.comparePassword = async function(candidatePassword) {

    return bcrypt.compare(
        candidatePassword,
        this.password
    );

};

const userModel = mongoose.model(
    "user",
    userSchema
);

export default userModel;