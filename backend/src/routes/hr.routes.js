import { Router } from "express";

import verifyAuth from "../middlewares/verifyAuth.js";

import {
    getPendingCertificateRequests,
    approveCertificateRequest,
    rejectCertificateRequest
} from "../controllers/hr.controller.js";

const hrRouter = Router();

// All HR routes require authentication
hrRouter.use(verifyAuth);


/*
 * GET
 * View all pending certificate requests
 *
 * GET /api/hr/pending-requests
 */
hrRouter.get(
    "/pending-requests",
    getPendingCertificateRequests
);


/*
 * PUT
 * Approve a certificate request
 *
 * PUT /api/hr/certificate-requests/:id/approve
 */
hrRouter.put(
    "/certificate-requests/:id/approve",
    approveCertificateRequest
);


/*
 * PUT
 * Reject a certificate request
 *
 * PUT /api/hr/certificate-requests/:id/reject
 */
hrRouter.put(
    "/certificate-requests/:id/reject",
    rejectCertificateRequest
);

export default hrRouter;