import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import initJobs from "./src/jobs/index.js";

connectToDB();
initJobs();

app.listen(3000, '0.0.0.0', () => {
    console.log("server is listening on port 3000");
});


