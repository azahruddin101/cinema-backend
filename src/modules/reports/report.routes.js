import { Router } from 'express';
import reportController from './report.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get reports in a date range
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *         example: '2025-01-01'
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *         example: '2025-01-31'
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/', authenticate, reportController.getByDateRange);

/**
 * @swagger
 * /api/reports/export/excel:
 *   get:
 *     summary: Export reports to Excel format
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *         required: true
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Auth Token (optional alternative to Bearer header)
 *     responses:
 *       200:
 *         description: Excel file
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/excel', authenticate, reportController.exportExcel);

/**
 * @swagger
 * /api/reports/export/pdf:
 *   get:
 *     summary: Export reports to PDF format
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *         required: true
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Auth Token (optional alternative to Bearer header)
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/pdf', authenticate, reportController.exportPdf);



/**
 * @swagger
 * /api/reports/{date}:
 *   get:
 *     summary: Get daily report by date
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format
 *         example: '2025-01-15'
 *     responses:
 *       200:
 *         description: Daily report data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DailyReport'
 *       404:
 *         description: Report not found
 */
router.get('/:date', authenticate, reportController.getByDate);

export default router;
