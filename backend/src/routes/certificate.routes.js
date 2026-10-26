import express from "express";
import verifyAuth from "../middlewares/verifyAuth.js";
import { downloadCertificateAuthenticated } from "../controllers/certificateDownload.controller.js";

const certificateRouter = express.Router();

// Authenticated certificate download (Intern owner or Admin)
certificateRouter.get("/:id/download", verifyAuth, downloadCertificateAuthenticated);
certificateRouter.get("/download/:id", verifyAuth, downloadCertificateAuthenticated);

export default certificateRouter;
