import 'dotenv/config'; // Loads environment variables before running checkEnv
import checkEnv from "./src/config/checkEnv.js";
import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { scheduleInternshipStatusJob } from "./src/jobs/internshipStatus.job.js";
import { scheduleRetentionJob } from "./src/jobs/retention.job.js";

// 1. Mandatory Week 3 startup check: Halts execution if .env variables are missing[cite: 1]
checkEnv();

const startServer = async () => {
    await connectToDB();
    scheduleInternshipStatusJob();
    scheduleRetentionJob();

    // 2. Task J Requirement: Trust reverse proxy so rate limiters and audit logs catch real IPs[cite: 1]
    app.set('trust proxy', 1);

    app.listen(3000, () => {
        console.log("server is listening on port 3000");
    });
};

startServer().catch((error) => {
    console.error("Server startup failed", error);
    process.exitCode = 1;
});