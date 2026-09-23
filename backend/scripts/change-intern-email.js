import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
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

    const oldEmail = "sarveshchoudhary1125@gmail.com";
    const newEmail = "sarveshchoudhary2606@gmail.com";

    const user = await User.findOne({ email: oldEmail });

    if (!user) {
      console.log(`User not found: ${oldEmail}`);
      return;
    }

    const existingUser = await User.findOne({ email: newEmail });

    if (existingUser) {
      console.log(`Another user already uses: ${newEmail}`);
      return;
    }

    user.email = newEmail;
    await user.save();

    console.log("Intern email updated successfully:");
    console.log(`Old: ${oldEmail}`);
    console.log(`New: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Intern Code: ${user.internCode}`);
  } catch (error) {
    console.error("Update failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();