import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
{
    fullName: {
        type: String
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
    this.password = await bcrypt.hash(this.password, 10);
    next;
});

const userModel = mongoose.model(
    "user",
    userSchema
);

export default userModel;
