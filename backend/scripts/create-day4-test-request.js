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

const createDay4TestRequest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const admin = await User.findOne({
            email: "admin@uptoskills.com",
            role: "admin"
        });

        if (!admin) {
            throw new Error("Admin user not found.");
        }

        const template = await CertificateTemplate.findOne({
            certificateType: "completion",
            isActive: true
        }).sort({
            updatedAt: -1
        });

        if (!template) {
            throw new Error("Active completion template not found.");
        }

        let intern = await User.findOne({
            email: "sarveshchoudhary1125@gmail.com"
        });

        if (!intern) {
            intern = await User.create({
                fullName: "Test Intern",
                email: "sarveshchoudhary1125@gmail.com",
                mobileNo: "9999999998",
                password: "Intern@12345",
                role: "intern",
                domain: "Full Stack Development",
                startDate: new Date("2026-08-01"),
                endDate: new Date("2026-09-01")
            });

            console.log("Real-email test intern created.");
        } else {
            console.log("Real-email test intern already exists.");
        }

        const request = await CertificateRequest.create({
            requestNumber: `TEST-DAY4-${Date.now()}`,
            userId: intern._id,
            internCode: intern.internCode,
            certificateType: "completion",
            templateId: template._id,
            reason: "Day 4 PDF and email attachment testing",
            status: "processing",
            requestedAt: new Date()
        });

        console.log("\n--- DAY 4 TEST REQUEST ---");
        console.log("Request ID:", request._id.toString());
        console.log("Request Number:", request.requestNumber);
        console.log("Status:", request.status);
        console.log("Intern:", intern.fullName);
        console.log("Email:", intern.email);
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

createDay4TestRequest();