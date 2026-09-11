import connectToDB from "../src/config/database.js";
import User from "../src/models/User.js";

async function createAdmin() {
  try {
    await connectToDB();
    console.log("Connected to MongoDB successfully.");

    const email = "admin@uptoskills.com";
    const password = "admin123";

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`Admin user already exists with email: ${email}`);
      console.log("Role:", existingAdmin.role);
      process.exit(0);
    }

    const admin = await User.create({
      fullName: "Admin User",
      email: email,
      password: password,
      role: "admin"
    });

    console.log("\n✅ Admin user created successfully!");
    console.log("-----------------------------------");
    console.log("Email:   ", admin.email);
    console.log("Password:", password);
    console.log("Role:    ", admin.role);
    console.log("-----------------------------------\n");

    process.exit(0);
  } catch (err) {
    console.error("Error creating admin user:", err);
    process.exit(1);
  }
}

createAdmin();
