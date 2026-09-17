import bcrypt from "bcryptjs";
import connectToDB from "../src/config/database.js";
import User from "../src/models/User.js";

await connectToDB();

const fullName = "UptoSkills Admin";
const email = "admin@uptoskills.com";
const password = "Admin@123";

try {
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
        console.log("Admin already exists!");
        console.log("Email:", email);
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
        fullName,
        email,
        password: hashedPassword,
        role: "admin"
    });

    console.log("================================");
    console.log("Admin created successfully!");
    console.log("Name:", admin.fullName);
    console.log("Email:", admin.email);
    console.log("Password:", password);
    console.log("Role:", admin.role);
    console.log("================================");

    process.exit(0);
} catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
}