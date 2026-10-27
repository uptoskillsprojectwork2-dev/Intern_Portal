import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config();

const APPLY_CONFIRMATION = 'APPLY_TEAM_LEADER_ID_BACKFILL';
const apply = process.argv.includes('--apply');
const confirmed = process.argv.includes(`--confirm=${APPLY_CONFIRMATION}`);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function inspectMappings() {
  const [interns, teamLeaders] = await Promise.all([
    User.find({ role: 'intern' }).select('_id internshipDetails.teamLeaderId internshipDetails.teamLeader internshipDetails.teamleaderEmail').lean(),
    User.find({ role: 'teamleader' }).select('_id email').lean()
  ]);
  const leadersByEmail = new Map();
  const leadersById = new Map(teamLeaders.map((leader) => [String(leader._id), leader]));
  for (const leader of teamLeaders) {
    const key = normalizeEmail(leader.email);
    if (!key) continue;
    leadersByEmail.set(key, [...(leadersByEmail.get(key) || []), leader]);
  }

  const duplicateTeamLeaderEmails = [...leadersByEmail.entries()]
    .filter(([, leaders]) => leaders.length > 1)
    .map(([email, leaders]) => ({ email, teamLeaderIds: leaders.map(({ _id }) => String(_id)) }));
  const matched = [];
  const unmatched = [];
  const ambiguous = [];
  const duplicateAssignments = [];
  const updates = [];

  for (const intern of interns) {
    const details = intern.internshipDetails || {};
    const email = normalizeEmail(details.teamleaderEmail);
    const emailMatches = email ? leadersByEmail.get(email) || [] : [];
    const legacyLeader = details.teamLeader ? leadersById.get(String(details.teamLeader)) : null;
    const canonicalLeader = details.teamLeaderId ? leadersById.get(String(details.teamLeaderId)) : null;

    if (emailMatches.length > 1 || (legacyLeader && emailMatches.length === 1 && String(legacyLeader._id) !== String(emailMatches[0]._id)) ||
      (canonicalLeader && emailMatches.length === 1 && String(canonicalLeader._id) !== String(emailMatches[0]._id))) {
      ambiguous.push({ internId: String(intern._id), teamleaderEmail: email || null, candidates: [...new Set([
        ...emailMatches.map(({ _id }) => String(_id)),
        ...(legacyLeader ? [String(legacyLeader._id)] : []),
        ...(canonicalLeader ? [String(canonicalLeader._id)] : [])
      ])] });
      continue;
    }

    const candidate = canonicalLeader || legacyLeader || (emailMatches.length === 1 ? emailMatches[0] : null);
    if (!candidate) {
      unmatched.push({ internId: String(intern._id), teamleaderEmail: email || null });
      continue;
    }

    matched.push({ internId: String(intern._id), teamLeaderId: String(candidate._id), source: canonicalLeader ? 'teamLeaderId' : legacyLeader ? 'teamLeader' : 'teamleaderEmail' });
    if (!details.teamLeaderId || String(details.teamLeaderId) !== String(candidate._id) || !details.teamLeader || String(details.teamLeader) !== String(candidate._id)) {
      updates.push({ internId: intern._id, teamLeaderId: candidate._id });
    }
    if (legacyLeader && canonicalLeader && String(legacyLeader._id) === String(canonicalLeader._id)) {
      duplicateAssignments.push({ internId: String(intern._id), teamLeaderId: String(canonicalLeader._id), fields: ['teamLeader', 'teamLeaderId'] });
    }
  }

  return { internCount: interns.length, teamLeaderCount: teamLeaders.length, matched, unmatched, ambiguous, duplicateTeamLeaderEmails, duplicateAssignments, updates };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to inspect team leader references.');
  if (apply && !confirmed) throw new Error(`Applying changes requires both --apply and --confirm=${APPLY_CONFIRMATION}.`);

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const report = await inspectMappings();
  console.info(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY RUN (read-only)',
    summary: {
      interns: report.internCount,
      teamLeaders: report.teamLeaderCount,
      matched: report.matched.length,
      unmatched: report.unmatched.length,
      ambiguous: report.ambiguous.length,
      duplicateTeamLeaderEmails: report.duplicateTeamLeaderEmails.length,
      duplicateMappings: report.duplicateTeamLeaderEmails.length,
      internsWithRedundantDualReferences: report.duplicateAssignments.length,
      safeUpdatesPending: report.updates.length
    },
    unmatched: report.unmatched,
    ambiguous: report.ambiguous,
    duplicateMappings: report.duplicateTeamLeaderEmails,
    internsWithRedundantDualReferences: report.duplicateAssignments
  }, null, 2));

  if (apply) {
    for (const update of report.updates) {
      await User.updateOne({ _id: update.internId }, { $set: {
        'internshipDetails.teamLeaderId': update.teamLeaderId,
        'internshipDetails.teamLeader': update.teamLeaderId
      } });
    }
    console.info(`Applied ${report.updates.length} unambiguous updates. Unmatched and ambiguous records were left unchanged.`);
  } else {
    console.info(`Dry run only. To apply these ${report.updates.length} unambiguous updates, rerun with --apply --confirm=${APPLY_CONFIRMATION}.`);
  }

  await mongoose.disconnect();
  if (report.unmatched.length || report.ambiguous.length) process.exitCode = 2;
}

main().catch(async (error) => {
  console.error('Team leader mapping inspection failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
