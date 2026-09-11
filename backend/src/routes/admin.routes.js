import express from 'express';
import { registerValidator, teamLeaderValidator } from "../validators/auth.validator.js";
import {
  createIntern,
  createTeamLeader,
  getAllTeamLeaders,
  getInternsByTeamLeader,
  getForwardedRequests,
  finalizeRequest,
  getCertificateDraft,
  updateCertificateDraft,
  finalizeCertificate
} from "../controllers/admin.controller.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const adminRouter = express.Router();


// POST api/auth/register-intern
adminRouter.post("/create-intern", verifyAuth, requireAdmin, registerValidator, createIntern);

// POST api/auth/register-tl
adminRouter.post("/create-tl", verifyAuth, requireAdmin, teamLeaderValidator, createTeamLeader);

adminRouter.get("/teamleaders", verifyAuth, requireAdmin, getAllTeamLeaders);

adminRouter.get("/teamleaders/:id/interns", verifyAuth, requireAdmin, getInternsByTeamLeader);

adminRouter.get("/forwarded-requests", verifyAuth, requireAdmin, getForwardedRequests);

adminRouter.patch("/requests/:id/finalize", verifyAuth, requireAdmin, finalizeRequest);

// Certificate draft review and editing endpoints (Day 3)
adminRouter.get("/certificates/draft/:id", verifyAuth, requireAdmin, getCertificateDraft);
adminRouter.patch("/certificates/draft/:id", verifyAuth, requireAdmin, updateCertificateDraft);
adminRouter.put("/certificates/draft/:id", verifyAuth, requireAdmin, updateCertificateDraft);

// Certificate finalization and PDF generation endpoint (Day 4)
adminRouter.post("/certificates/:id/finalize", verifyAuth, requireAdmin, finalizeCertificate);

export default adminRouter;