import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { startInternshipCompletionAlertScheduler } from "./src/services/internshipCompletionAlert.service.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectToDB();
        startInternshipCompletionAlertScheduler();

        app.listen(PORT, () => {
            console.log(`server is listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("Unable to start server", error);
        process.exit(1);
    }
};

startServer();
