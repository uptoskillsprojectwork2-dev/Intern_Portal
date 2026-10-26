import app from "./src/app.js"
import connectToDB from "./src/config/database.js"
import { scheduleInternshipStatusJob } from "./src/jobs/internshipStatus.job.js"
import { scheduleRetentionJob } from "./src/jobs/retention.job.js"

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

