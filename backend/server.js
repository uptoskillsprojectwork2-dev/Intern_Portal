import app from "./src/app.js";
import connectToDB from "./src/config/database.js";
import { startCompletionMonitor } from "./src/services/teamLeaderCompletionMonitor.js";

connectToDB()
  .then(() => {
    startCompletionMonitor();
  })
  .catch((err) => {
    console.error("Database connection failed on startup:", err.message);
  });

app.listen(3000,()=>{
    console.log("server is listening on port 3000")
})

