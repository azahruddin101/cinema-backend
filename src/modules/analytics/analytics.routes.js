import express from 'express';
import { getPredictionInsights } from './analytics.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/predict:
 *   get:
 *     summary: Get AI-powered performance predictions and insights
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/predict', authenticate, authorizeRoles('admin'), getPredictionInsights);

export default router;
