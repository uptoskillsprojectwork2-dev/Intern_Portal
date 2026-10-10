import app from "./src/app.js"
import connectToDB from "./src/config/database.js"
import { initInternshipStatusJob } from "./src/jobs/internshipStatus.job.js"
import { initRetentionJob } from "./src/jobs/retention.job.js"
connectToDB()

// Initialize background jobs
initInternshipStatusJob()
initRetentionJob()

app.listen(3000,()=>{
    console.log("server is listening on port 3000")
})

