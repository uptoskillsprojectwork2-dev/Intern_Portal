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

const createTestData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // 1. Find or create test intern
        let intern = await User.findOne({
            email: "intern@test.com"
        });

        if (!intern) {
            intern = await User.create({
                fullName: "Test Intern",
                email: "intern@test.com",
                mobileNo: "9999999998",
                password: "Intern@12345",
                role: "intern",
                domain: "Full Stack Development",
                startDate: new Date("2026-08-01"),
                endDate: new Date("2026-09-01")
            });

            console.log("Test intern created.");
        } else {
            console.log("Test intern already exists.");
        }

        // 2. Find active completion template
        const template = await CertificateTemplate.findOne({
            certificateType: "completion",
            isActive: true
        }).sort({ createdAt: -1 });

        if (!template) {
            throw new Error(
                "No active completion template found. Activate the template first."
            );
        }

        // 3. Find or create approved certificate request
        let request = await CertificateRequest.findOne({
            requestNumber: "TEST-DAY2-001"
        });

        if (!request) {
            request = await CertificateRequest.create({
                requestNumber: "TEST-DAY2-001",
                userId: intern._id,
                internCode: intern.internCode,
                certificateType: "completion",
                templateId: template._id,
                reason: "Day 2 certificate draft testing",
                status: "approved",
                requestedAt: new Date(),
                reviewedAt: new Date(),
                reviewedBy: (
                    await User.findOne({
                        email: "admin@uptoskills.com"
                    })
                )._id
            });

            console.log("Approved certificate request created.");
        } else {
            console.log("Certificate request already exists.");
        }

        console.log("\n--- DAY 2 TEST DATA ---");
        console.log("Intern ID:", intern._id.toString());
        console.log("Intern Code:", intern.internCode);
        console.log("Request ID:", request._id.toString());
        console.log("Request Number:", request.requestNumber);
        console.log("Template ID:", template._id.toString());
        console.log("Template Active:", template.isActive);

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error("\nFailed:", error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

createTestData();