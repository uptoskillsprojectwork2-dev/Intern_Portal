import app from "./src/app.js"
import connectToDB from "./src/config/database.js"
import { scheduleInternshipStatusJob } from "./src/jobs/internshipStatus.job.js"
import { scheduleRetentionJob } from "./src/jobs/retention.job.js"

const startServer = async () => {
    const required = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL', 'BREVO_SMTP_USER', 'BREVO_SMTP_KEY'];
    const missing = required.filter((name) => !process.env[name]?.trim());
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
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

