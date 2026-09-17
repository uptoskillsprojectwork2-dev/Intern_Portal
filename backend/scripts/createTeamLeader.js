import bcrypt from "bcryptjs";
import connectToDB from "../src/config/database.js";
import User from "../src/models/User.js";

await connectToDB();

const fullName = "UptoSkills Team Leader";
const email = "teamleader@uptoskills.com";
const password = "Team@123";

try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        console.log("Team Leader already exists!");
        console.log("Email:", email);
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const teamLeader = await User.create({
        fullName,
        email,
        password: hashedPassword,
        role: "teamleader"
    });

    console.log("================================");
    console.log("Team Leader created successfully!");
    console.log("Name:", teamLeader.fullName);
    console.log("Email:", teamLeader.email);
    console.log("Password:", password);
    console.log("Role:", teamLeader.role);
    console.log("================================");

    process.exit(0);
} catch (error) {
    console.error("Error creating Team Leader:", error);
    process.exit(1);
}