import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import User from "../src/models/User.js";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Create or update demo archived interns
  const demoArchived = [
    {
      fullName: "Rahul Sharma (Archived Demo)",
      email: "archivedintern@uptoskills.com",
      mobileNo: "9876543210",
      internCode: "INT-ARCH-001",
      domain: "Full Stack Web Development",
      role: "intern",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-08-31"),
      isArchived: true,
      archivedAt: new Date(Date.now() - 15 * 86400000), // Archived 15 days ago
      internshipDetails: {
        status: "completed",
        internshipTitle: "Web Development Intern"
      },
      password: "Intern@123456"
    },
    {
      fullName: "Priya Patel (Archived Demo)",
      email: "priya.archived@uptoskills.com",
      mobileNo: "9123456789",
      internCode: "INT-ARCH-002",
      domain: "Data Science & AI",
      role: "intern",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-07-31"),
      isArchived: true,
      archivedAt: new Date(Date.now() - 25 * 86400000), // Archived 25 days ago
      internshipDetails: {
        status: "completed",
        internshipTitle: "Data Science Intern"
      },
      password: "Intern@123456"
    }
  ];

  for (const item of demoArchived) {
    const existing = await User.findOne({ email: item.email });
    if (!existing) {
      await User.create(item);
      console.log(`Created archived intern: ${item.fullName} (${item.email})`);
    } else {
      existing.isArchived = true;
      existing.archivedAt = item.archivedAt;
      existing.purgedAt = null;
      await existing.save();
      console.log(`Updated archived intern: ${item.fullName} (${item.email})`);
    }
  }

  console.log("Seeding complete! Refresh your Admin Dashboard to see them in 'Archived Interns'.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
