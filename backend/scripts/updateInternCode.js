import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import User from "../src/models/User.js";

dotenv.config();

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const updateInternCode = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({
      email: "sarveshchoudhary2606@gmail.com",
    });

    if (!user) {
      console.log("Intern not found.");
      return;
    }

    console.log("Old internCode:", user.internCode);

    user.internCode = "USINT2026030978154";
    await user.save();

    console.log("New internCode:", user.internCode);
    console.log("Intern code updated successfully.");
  } catch (error) {
    console.error("Update failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

updateInternCode();