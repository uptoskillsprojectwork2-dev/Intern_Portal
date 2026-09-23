import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

dotenv.config();

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    const email = "sarveshchoudhary2606@gmail.com";
    const newPassword = "Sarveshom@12023002001125";

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User not found: ${email}`);
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log("Test intern password updated successfully.");
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log("Password updated successfully.");
  } catch (error) {
    console.error("Password reset failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();