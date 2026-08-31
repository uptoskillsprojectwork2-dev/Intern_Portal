import { Router } from "express";

import verifyAuth from "../middlewares/verifyAuth.js";

import {
    getMyInternship,
    submitCertificateRequest,
    getMyCertificateRequests
} from "../controllers/intern.controller.js";

const internRouter = Router();

// All intern routes require authentication
internRouter.use(verifyAuth);


/*
 * Get logged-in intern's internship
 *
 * GET /api/intern/internship
 */
internRouter.get(
    "/internship",
    getMyInternship
);


/*
 * Submit certificate request
 *
 * POST /api/intern/certificate-requests
 */
internRouter.post(
    "/certificate-requests",
    submitCertificateRequest
);


/*
 * Get logged-in intern's certificate requests
 *
 * GET /api/intern/certificate-requests
 */
internRouter.get(
    "/certificate-requests",
    getMyCertificateRequests
);

export default internRouter;