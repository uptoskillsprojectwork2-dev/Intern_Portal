import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import requireAdmin from '../middlewares/requireAdmin.js';
import { dateRangeValidator, exportTypeValidator } from '../validators/analytics.validator.js';
import { createCacheMiddleware } from '../utils/cache.js';
import {
    getOverview,
    getRequestsTrend,
    getCertificateTypes,
    getTurnaround,
    getTeamLeaders,
    getDomains,
    getPipeline,
    getUpcomingCompletions,
    exportAnalytics,
} from '../controllers/analytics.controller.js';

const analyticsRouter = express.Router();

analyticsRouter.use(verifyAuth, requireAdmin);
analyticsRouter.use(dateRangeValidator);

analyticsRouter.get('/overview', createCacheMiddleware(180), getOverview);
analyticsRouter.get('/requests-trend', createCacheMiddleware(180), getRequestsTrend);
analyticsRouter.get('/certificate-types', createCacheMiddleware(180), getCertificateTypes);
analyticsRouter.get('/turnaround', createCacheMiddleware(180), getTurnaround);
analyticsRouter.get('/team-leaders', createCacheMiddleware(180), getTeamLeaders);
analyticsRouter.get('/domains', createCacheMiddleware(180), getDomains);
analyticsRouter.get('/pipeline', createCacheMiddleware(180), getPipeline);
analyticsRouter.get('/upcoming-completions', createCacheMiddleware(300), getUpcomingCompletions);
analyticsRouter.get('/export', exportTypeValidator, exportAnalytics);

export default analyticsRouter;
