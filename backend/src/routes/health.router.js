import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Task J Requirement: GET /api/health returns 200 and checks DB connection[cite: 1]
router.get('/health', (req, res) => {
    // readyState 1 means Mongoose is successfully connected
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
        return res.status(503).json({
            status: 'DOWN',
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }

    return res.status(200).json({
        status: 'UP',
        database: 'connected',
        timestamp: new Date().toISOString()
    });
});

export default router;