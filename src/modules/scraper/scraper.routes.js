import { Router } from 'express';
import { body } from 'express-validator';
import scraperController from './scraper.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/scraper/backfill:
 *   post:
 *     summary: Backfill historical MIS reports
 *     tags: [Scraper]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BackfillRequest'
 *     responses:
 *       200:
 *         description: Backfill results
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post(
    '/backfill',
    authenticate,
    authorizeRoles('admin'),
    [
        body('startDate')
            .matches(/^\d{4}-\d{2}-\d{2}$/)
            .withMessage('startDate must be in YYYY-MM-DD format'),
        body('endDate')
            .matches(/^\d{4}-\d{2}-\d{2}$/)
            .withMessage('endDate must be in YYYY-MM-DD format'),
        body('overwrite').optional().isBoolean().withMessage('overwrite must be a boolean'),
        validate,
    ],
    scraperController.backfill
);

/**
 * @swagger
 * /api/scraper/scrape-day:
 *   post:
 *     summary: Scrape a specific day's MIS report
 *     tags: [Scraper]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date]
 *             properties:
 *               date:
 *                 type: string
 *                 example: '2025-01-15'
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Scrape result
 */
router.post(
    '/scrape-day',
    authenticate,
    authorizeRoles('admin'),
    [
        body('date')
            .matches(/^\d{4}-\d{2}-\d{2}$/)
            .withMessage('date must be in YYYY-MM-DD format'),
        body('overwrite').optional().isBoolean().withMessage('overwrite must be a boolean'),
        validate,
    ],
    scraperController.scrapeDay
);

export default router;
