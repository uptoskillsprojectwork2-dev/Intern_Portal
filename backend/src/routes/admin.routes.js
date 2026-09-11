import express from 'express';
import { registerValidator, teamLeaderValidator } from "../validators/auth.validator.js";
import { 
  createIntern, 
  createTeamLeader, 
  getAllTeamLeaders, 
  getInternsByTeamLeader, 
  getForwardedRequests, 
  finalizeRequest,
  createTemplate,
  getAllTemplates,
  updateTemplate,
  toggleTemplateActive
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

// Template Management Routes
adminRouter.post("/templates", verifyAuth, requireAdmin, createTemplate);
adminRouter.get("/templates", verifyAuth, requireAdmin, getAllTemplates);
adminRouter.patch("/templates/:id", verifyAuth, requireAdmin, updateTemplate);
adminRouter.patch("/templates/:id/toggle", verifyAuth, requireAdmin, toggleTemplateActive);

export default adminRouter;