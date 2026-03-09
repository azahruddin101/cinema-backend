import { Router } from 'express';
import reportController from '../reports/report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary statistics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD). Defaults to 30 days ago.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD). Defaults to today.
 *     responses:
 *       200:
 *         description: Summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDays:
 *                       type: number
 *                     totalShows:
 *                       type: number
 *                     totalTickets:
 *                       type: number
 *                     totalBoxOffice:
 *                       type: number
 *                     totalConcessions:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                     averageOccupancy:
 *                       type: number
 */
router.get('/summary', authenticate, reportController.getSummary);

/**
 * @swagger
 * /api/dashboard/films:
 *   get:
 *     summary: Get film-wise performance
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Film performance data
 */
router.get('/films', authenticate, reportController.getFilmPerformance);

/**
 * @swagger
 * /api/dashboard/screens:
 *   get:
 *     summary: Get screen-wise performance
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Screen performance data
 */
router.get('/screens', authenticate, reportController.getScreenPerformance);

/**
 * @swagger
 * /api/dashboard/concessions:
 *   get:
 *     summary: Get concession-wise performance
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Concession performance data
 */
router.get('/concessions', authenticate, reportController.getConcessionPerformance);

/**
 * @swagger
 * /api/dashboard/trends:
 *   get:
 *     summary: Get daily trends (tickets, revenue, occupancy)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Trend data for charts
 */
router.get('/trends', authenticate, reportController.getTrends);

export default router;
