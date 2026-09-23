import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

import User from "../src/models/User.js";
import CertificateRequest from "../src/models/CertificateRequest.js";
import CertificateTemplate from "../src/models/CertificateTemplate.js";

dotenv.config();

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

const createDay3Request = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const intern = await User.findOne({
            email: "intern@test.com",
            role: "intern"
        });

        if (!intern) {
            throw new Error("Test intern not found.");
        }

        const template = await CertificateTemplate.findOne({
            certificateType: "completion",
            isActive: true
        }).sort({ createdAt: -1 });

        if (!template) {
            throw new Error("Active completion template not found.");
        }

        const requestNumber = `TEST-DAY3-${Date.now()}`;

        const request = await CertificateRequest.create({
            requestNumber,
            userId: intern._id,
            internCode: intern.internCode,
            certificateType: "completion",
            templateId: template._id,
            reason: "Day 3 automatic draft generation testing",
            status: "processing",
            requestedAt: new Date()
        });

        console.log("\n--- DAY 3 TEST REQUEST ---");
        console.log("Request ID:", request._id.toString());
        console.log("Request Number:", request.requestNumber);
        console.log("Status:", request.status);
        console.log("Intern:", intern.fullName);
        console.log("Template ID:", template._id.toString());

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error("Failed:", error.message);

        try {
            await mongoose.disconnect();
        } catch {}

        process.exit(1);
    }
};

createDay3Request();