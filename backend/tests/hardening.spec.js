import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure test environment variables before loading app
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "super_secret_test_jwt_key_12345";
process.env.FRONTEND_URL = "http://localhost:5173";

import app from "../src/app.js";
import User from "../src/models/User.js";
import CertificateRequest from "../src/models/CertificateRequest.js";
import Certificate from "../src/models/Certificate.js";
import CertificateTemplate from "../src/models/CertificateTemplate.js";
import { runBackfill } from "../scripts/backfillTeamLeaderId.js";

let mongoServer;

const createToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Task I: Hardening and Quality Backend Test Suite", () => {
  const setupActors = async () => {
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    const admin = await User.create({
      fullName: "Admin User",
      email: "admin@uptoskill.com",
      role: "admin",
      password: hashedPassword
    });

    const tlA = await User.create({
      fullName: "Team Leader A",
      email: "tla@uptoskill.com",
      role: "teamleader",
      password: hashedPassword
    });

    const tlB = await User.create({
      fullName: "Team Leader B",
      email: "tlb@uptoskill.com",
      role: "teamleader",
      password: hashedPassword
    });

    const internA = await User.create({
      fullName: "Intern Under TL A",
      email: "interna@uptoskill.com",
      role: "intern",
      internCode: "INT-001",
      domain: "Web Development",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-01"),
      password: hashedPassword,
      passwordSetAt: new Date(),
      internshipDetails: {
        teamLeaderId: tlA._id,
        teamLeader: tlA._id,
        teamleaderEmail: tlA.email.toLowerCase(),
        status: "completed"
      }
    });

    const internB = await User.create({
      fullName: "Intern Under TL B",
      email: "internb@uptoskill.com",
      role: "intern",
      internCode: "INT-002",
      domain: "Data Science",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-01"),
      password: hashedPassword,
      passwordSetAt: new Date(),
      internshipDetails: {
        teamLeaderId: tlB._id,
        teamLeader: tlB._id,
        teamleaderEmail: tlB.email.toLowerCase(),
        status: "completed"
      }
    });

    await CertificateTemplate.create({
      templateCode: "TPL_COMPLETION",
      templateName: "Completion Certificate Template",
      certificateType: "completion_certificate",
      title: "Certificate of Completion",
      status: "active",
      content: "<p>Certificate for {{fullName}}</p>",
      createdBy: admin._id
    });

    return { admin, tlA, tlB, internA, internB };
  };

  test("1. Full Flow: submit -> TL forward -> Admin approve -> draft created", async () => {
    const { admin, tlA, internA } = await setupActors();
    const internToken = createToken(internA);
    const tlToken = createToken(tlA);
    const adminToken = createToken(admin);

    // 1. Intern submits request
    const submitRes = await request(app)
      .post("/api/intern/request-certificate")
      .set("Cookie", [`token=${internToken}`])
      .send({ certificateType: "completion_certificate" });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.request).toBeDefined();
    expect(submitRes.body.request.status).toBe("pending");
    const requestId = submitRes.body.request._id;

    // 2. TL forwards request
    const forwardRes = await request(app)
      .patch(`/api/teamleader/requests/${requestId}/review`)
      .set("Cookie", [`token=${tlToken}`])
      .send({ action: "forward" });

    expect(forwardRes.status).toBe(200);
    expect(forwardRes.body.request.status).toBe("processing");

    // 3. Admin approves request -> draft created
    const approveRes = await request(app)
      .patch(`/api/admin/requests/${requestId}/finalize`)
      .set("Cookie", [`token=${adminToken}`])
      .send({ action: "approve" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.request.status).toBe("approved");
    expect(approveRes.body.certificate).toBeDefined();
    expect(approveRes.body.certificate.status).toBe("draft");
  });

  test("2. Role Gating: Unauthenticated -> 401, Intern calling admin route -> 403", async () => {
    const { internA } = await setupActors();
    const internToken = createToken(internA);

    // No cookie -> 401
    const unauthRes = await request(app).get("/api/admin/interns");
    expect(unauthRes.status).toBe(401);

    // Intern calling admin endpoint -> 403
    const forbiddenRes = await request(app)
      .get("/api/admin/interns")
      .set("Cookie", [`token=${internToken}`]);
    expect(forbiddenRes.status).toBe(403);
  });

  test("3. Duplicate pending request returns 409", async () => {
    const { internA } = await setupActors();
    const internToken = createToken(internA);

    const firstRes = await request(app)
      .post("/api/intern/request-certificate")
      .set("Cookie", [`token=${internToken}`])
      .send({ certificateType: "completion_certificate" });
    expect(firstRes.status).toBe(201);

    // Duplicate submit
    const duplicateRes = await request(app)
      .post("/api/intern/request-certificate")
      .set("Cookie", [`token=${internToken}`])
      .send({ certificateType: "completion_certificate" });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.message).toMatch(/already have a request in progress/i);
  });

  test("4. Scoping: TL B cannot review or see TL A's intern request (403)", async () => {
    const { tlA, tlB, internA } = await setupActors();
    const internToken = createToken(internA);
    const tlAToken = createToken(tlA);
    const tlBToken = createToken(tlB);

    // Intern A (under TL A) submits
    const submitRes = await request(app)
      .post("/api/intern/request-certificate")
      .set("Cookie", [`token=${internToken}`])
      .send({ certificateType: "completion_certificate" });
    const requestId = submitRes.body.request._id;

    // TL B queries requests for review -> should NOT see Intern A's request
    const tlBListRes = await request(app)
      .get("/api/teamleader/requests-for-review")
      .set("Cookie", [`token=${tlBToken}`]);
    expect(tlBListRes.status).toBe(200);
    expect(tlBListRes.body.requests).toEqual([]);

    // TL A queries requests for review -> DOES see Intern A's request
    const tlAListRes = await request(app)
      .get("/api/teamleader/requests-for-review")
      .set("Cookie", [`token=${tlAToken}`]);
    expect(tlAListRes.status).toBe(200);
    expect(tlAListRes.body.requests.length).toBe(1);

    // TL B attempts to review Intern A's request -> 403 Forbidden!
    const reviewRes = await request(app)
      .patch(`/api/teamleader/requests/${requestId}/review`)
      .set("Cookie", [`token=${tlBToken}`])
      .send({ action: "forward" });

    expect(reviewRes.status).toBe(403);
    expect(reviewRes.body.message).toMatch(/access denied/i);
  });

  test("5. Archived intern is blocked from login (403)", async () => {
    const hashedPassword = await bcrypt.hash("Password123!", 10);
    await User.create({
      fullName: "Archived Intern",
      email: "archived@uptoskill.com",
      role: "intern",
      password: hashedPassword,
      isArchived: true,
      archivedAt: new Date()
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "archived@uptoskill.com",
        password: "Password123!"
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toMatch(/archived/i);
  });

  test("6. Login rate limiting blocks sixth attempt with 429 and Retry-After header", async () => {
    const testEmail = "ratelimit_test@uptoskill.com";

    // 5 attempts should return 401 (invalid credentials)
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: "WrongPassword!" });
      expect(res.status).toBe(401);
    }

    // 6th attempt must be blocked with 429
    const blockedRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: "WrongPassword!" });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers["retry-after"]).toBeDefined();
    expect(blockedRes.body.message).toMatch(/too many login attempts/i);
  });

  test("7. Certificate PDF access requires authentication and ownership", async () => {
    const { admin, internA, internB } = await setupActors();
    const internAToken = createToken(internA);
    const internBToken = createToken(internB);
    const adminToken = createToken(admin);

    // Create a mock finalized certificate and temporary file
    const uploadsDir = path.resolve(__dirname, "../uploads/certificates");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const testPdfPath = path.join(uploadsDir, "test_cert_001.pdf");
    fs.writeFileSync(testPdfPath, "%PDF-1.4 test certificate content");

    const certA = await Certificate.create({
      certificateNumber: "UPTO-2026-TEST01",
      certificateType: "completion_certificate",
      userId: internA._id,
      internCode: internA.internCode,
      status: "finalized",
      pdfPath: "uploads/certificates/test_cert_001.pdf",
      verificationCode: "VER-TEST-12345"
    });

    // Unauthenticated download -> 401
    const unauthDownload = await request(app).get(`/api/certificates/${certA._id}/download`);
    expect(unauthDownload.status).toBe(401);

    // Other intern (internB) downloading certA -> 403 Access denied
    const unauthorizedDownload = await request(app)
      .get(`/api/certificates/${certA._id}/download`)
      .set("Cookie", [`token=${internBToken}`]);
    expect(unauthorizedDownload.status).toBe(403);

    // Owner intern (internA) downloading certA -> 200
    const ownerDownload = await request(app)
      .get(`/api/certificates/${certA._id}/download`)
      .set("Cookie", [`token=${internAToken}`]);
    expect(ownerDownload.status).toBe(200);
    expect(ownerDownload.headers["content-type"]).toMatch(/pdf/);

    // Admin downloading certA -> 200
    const adminDownload = await request(app)
      .get(`/api/certificates/${certA._id}/download`)
      .set("Cookie", [`token=${adminToken}`]);
    expect(adminDownload.status).toBe(200);

    // Cleanup temp file
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });

  test("8. Backfill Script links interns to TL ID and is idempotent", async () => {
    const hashedPassword = await bcrypt.hash("Password123!", 10);
    const tl = await User.create({
      fullName: "Team Leader Target",
      email: "tltarget@uptoskill.com",
      role: "teamleader",
      password: hashedPassword
    });

    const internLegacy = await User.create({
      fullName: "Legacy Intern",
      email: "legacy@uptoskill.com",
      role: "intern",
      internCode: "INT-LEGACY",
      password: hashedPassword,
      internshipDetails: {
        teamleaderEmail: "tltarget@uptoskill.com" // has email but NO teamLeaderId!
      }
    });

    // Run backfill first time
    const report1 = await runBackfill();
    expect(report1.unmatched).toBe(0);
    expect(report1.updated).toBeGreaterThanOrEqual(1);

    const refreshed = await User.findById(internLegacy._id);
    expect(refreshed.internshipDetails.teamLeaderId.toString()).toBe(tl._id.toString());

    // Run backfill second time (idempotency check)
    const report2 = await runBackfill();
    expect(report2.unmatched).toBe(0);
    expect(report2.updated).toBe(0); // already up to date, 0 updated!
  });
});
