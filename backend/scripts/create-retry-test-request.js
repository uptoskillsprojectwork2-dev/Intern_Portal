import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import CertificateRequest from "../src/models/CertificateRequest.js";
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

    const userId = "6aa7823180057dcf644f457c";

    const user = await User.findById(userId);

    if (!user) {
      throw new Error("Test intern not found");
    }

    const requestNumber = `TEST-DAY5-RETRY-${Date.now()}`;

    const request = await CertificateRequest.create({
      requestNumber,
      userId: user._id,
      internCode: user.internCode,
      certificateType: "completion",
      reason: "Day 5 retry generation test",
      status: "approved"
    });

    console.log("Retry test request created successfully:");
    console.log({
      id: request._id.toString(),
      requestNumber: request.requestNumber,
      userId: request.userId.toString(),
      certificateType: request.certificateType,
      status: request.status,
      certificateId: request.certificateId || null
    });
  } catch (error) {
    console.error("Failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();