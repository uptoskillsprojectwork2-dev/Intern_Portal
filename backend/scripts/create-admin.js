import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import readline from "readline";
import User from "../src/models/User.js";

dotenv.config();

dns.setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) =>
    new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("\n=== Certificate Engine - First Admin Setup ===\n");

        const fullName = await ask("Admin full name: ");
        const email = await ask("Admin email: ");
        const mobileNo = await ask("Admin mobile number: ");
        const password = await ask("Admin password: ");

        if (!fullName || !email || !password) {
            console.error(
                "\nFull name, email, and password are required."
            );

            await mongoose.disconnect();
            rl.close();
            process.exit(1);
        }

        if (password.length < 8) {
            console.error(
                "\nPassword must be at least 8 characters."
            );

            await mongoose.disconnect();
            rl.close();
            process.exit(1);
        }

        const normalizedEmail = email.toLowerCase();

        const existingAdmin = await User.findOne({
            email: normalizedEmail
        });

        if (existingAdmin) {
            console.log(
                "\nAn account with this email already exists."
            );

            await mongoose.disconnect();
            rl.close();
            process.exit(1);
        }

        const admin = await User.create({
            fullName,
            email: normalizedEmail,
            mobileNo,
            password,
            role: "admin"
        });

        console.log("\nAdmin created successfully!");
        console.log("Name:", admin.fullName);
        console.log("Email:", admin.email);
        console.log("Role:", admin.role);
        console.log("\nYou can now log in using the credentials you entered.\n");

        await mongoose.disconnect();
        rl.close();
        process.exit(0);

    } catch (error) {
        console.error(
            "\nFailed to create admin:",
            error.message
        );

        await mongoose.disconnect().catch(() => {});
        rl.close();
        process.exit(1);
    }
};

createAdmin();