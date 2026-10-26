import dotenv from "dotenv";
dotenv.config();

// Configuration check: stop with a clear error if a required variable is missing
const REQUIRED_ENV_VARS = [
    "MONGO_URI",
    "JWT_SECRET",
    "FRONTEND_URL",
    "BREVO_SMTP_USER",
    "BREVO_SMTP_KEY"
];

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key] || !process.env[key].trim());
if (missingEnvVars.length > 0) {
    console.error(`FATAL CONFIGURATION ERROR: Missing required environment variable(s): ${missingEnvVars.join(", ")}`);
    process.exit(1);
}

import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { scheduleInternshipStatusJob } from "./src/jobs/internshipStatus.job.js";
import { scheduleRetentionJob } from "./src/jobs/retention.job.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectToDB();
    scheduleInternshipStatusJob();
    scheduleRetentionJob();

    app.listen(3000, () => {
        console.log("server is listening on port 3000")
    });
};

startServer().catch((error) => {
    console.error("Server startup failed", error);
    process.exitCode = 1;
});

