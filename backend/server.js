import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { startInternshipAlertScheduler } from "./src/schedulers/internshipAlert.scheduler.js";

async function startServer() {
    try {
        await connectToDB();
        startInternshipAlertScheduler();

        app.listen(3000, () => {
            console.log("server is listening on port 3000");
        });
    } catch (err) {
        console.error("Failed to start server:", err.message);
        process.exit(1);
    }
}

startServer();


