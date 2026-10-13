import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { initInternshipStatusSchedule } from "./jobs/internshipStatus.job.js";
import { initRetentionSchedule } from "./jobs/retention.job.js";

connectToDB();

initInternshipStatusSchedule();
initRetentionSchedule();

app.listen(3000, () => {
    console.log("server is listening on port 3000");
});

