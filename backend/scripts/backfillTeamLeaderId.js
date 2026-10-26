import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import User from "../src/models/User.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dotenv.config();

function resolveMongoUri() {
  const configured = new URL(process.env.MONGO_URI);
  if (configured.protocol !== "mongodb+srv:" || !process.env.MONGO_SEED_HOSTS) return process.env.MONGO_URI;

  const query = new URLSearchParams(configured.search);
  for (const [key, value] of new URLSearchParams(process.env.MONGO_SRV_OPTIONS || "")) {
    if (!query.has(key)) query.set(key, value);
  }
  if (!query.has("tls") && !query.has("ssl")) query.set("tls", "true");
  const auth = configured.username
    ? `${configured.username}${configured.password ? `:${configured.password}` : ""}@`
    : "";
  const hosts = process.env.MONGO_SEED_HOSTS.split(",").map((host) => `${host.trim()}:27017`).join(",");
  return `mongodb://${auth}${hosts}${configured.pathname || "/"}?${query.toString()}`;
}

export async function runBackfill({ dryRun = false } = {}) {
  const teamLeaders = await User.find({ role: "teamleader" });
  const tlByEmail = new Map();
  const tlById = new Map();

  for (const tl of teamLeaders) {
    if (tl.email) {
      tlByEmail.set(tl.email.toLowerCase().trim(), tl);
    }
    tlById.set(tl._id.toString(), tl);
  }

  const interns = await User.find({ role: "intern" });
  let alreadySet = 0;
  let updated = 0;
  let unmatched = 0;
  const unmatchedList = [];

  for (const intern of interns) {
    const details = intern.internshipDetails || {};
    const tlEmail = details.teamleaderEmail ? details.teamleaderEmail.toLowerCase().trim() : null;
    const existingTlId = details.teamLeaderId ? details.teamLeaderId.toString() : (details.teamLeader ? details.teamLeader.toString() : null);

    let matchedTL = null;
    if (tlEmail && tlByEmail.has(tlEmail)) {
      matchedTL = tlByEmail.get(tlEmail);
    } else if (existingTlId && tlById.has(existingTlId)) {
      matchedTL = tlById.get(existingTlId);
    }

    if (matchedTL) {
      const currentTlId = details.teamLeaderId ? details.teamLeaderId.toString() : null;
      const currentTL = details.teamLeader ? details.teamLeader.toString() : null;
      const targetId = matchedTL._id.toString();

      if (currentTlId === targetId && currentTL === targetId && details.teamleaderEmail === matchedTL.email.toLowerCase()) {
        alreadySet++;
      } else {
        if (!dryRun) {
          if (!intern.internshipDetails) intern.internshipDetails = {};
          intern.internshipDetails.teamLeaderId = matchedTL._id;
          intern.internshipDetails.teamLeader = matchedTL._id;
          if (!intern.internshipDetails.teamleaderEmail) {
            intern.internshipDetails.teamleaderEmail = matchedTL.email.toLowerCase();
          }
          await intern.save();
        }
        updated++;
        console.log(`[LINKED] Intern ${intern._id} (${intern.email}) -> TL ${matchedTL._id} (${matchedTL.email})`);
      }
    } else {
      unmatched++;
      unmatchedList.push({
        id: intern._id,
        email: intern.email,
        teamleaderEmail: details.teamleaderEmail || "(none)"
      });
      console.warn(`[UNMATCHED] Intern ${intern._id} (${intern.email}) has teamleaderEmail "${details.teamleaderEmail || "none"}" which matches no Team Leader.`);
    }
  }

  const report = {
    totalInterns: interns.length,
    alreadySet,
    updated,
    totalLinked: alreadySet + updated,
    unmatched,
    unmatchedList
  };

  console.log("\n================ BACKFILL REPORT ================");
  console.log(`Total Interns Processed : ${report.totalInterns}`);
  console.log(`Already Linked (Noop)   : ${report.alreadySet}`);
  console.log(`Newly Updated           : ${report.updated}`);
  console.log(`Total Linked to TL ID   : ${report.totalLinked}`);
  console.log(`Unmatched Interns       : ${report.unmatched}`);
  console.log("=================================================\n");

  return report;
}

// Standalone execution
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/backfillTeamLeaderId.js")) {
  let connected = false;
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI must be configured in environment");
    }
    await mongoose.connect(resolveMongoUri(), { serverSelectionTimeoutMS: 10000 });
    connected = true;
    console.log("Connected to MongoDB for backfill.");
    const dryRun = process.argv.includes("--dry-run");
    const report = await runBackfill({ dryRun });
    if (report.unmatched > 0) {
      console.warn(`Warning: ${report.unmatched} interns could not be matched to any Team Leader.`);
    }
  } catch (err) {
    console.error("Backfill failed:", err.message);
    process.exitCode = 1;
  } finally {
    if (connected) await mongoose.disconnect();
  }
}
