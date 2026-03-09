import reportService from './report.service.js';
import reportExportService from './report.export.service.js';

class ReportController {
    /**
     * GET /api/reports/:date
     * Get daily report by date.
     */
    async getByDate(req, res, next) {
        try {
            const { date } = req.params;
            const report = await reportService.getByDate(date);

            res.status(200).json({
                success: true,
                data: report,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/reports?startDate=&endDate=
     * Get reports in a date range.
     */
    async getByDateRange(req, res, next) {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate and endDate query parameters are required',
                });
            }

            const reports = await reportService.getByDateRange(startDate, endDate);

            res.status(200).json({
                success: true,
                count: reports.length,
                data: reports,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/dashboard/summary
     * Get dashboard summary statistics.
     */
    async getSummary(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const summary = await reportService.getSummary(startDate, endDate);

            res.status(200).json({
                success: true,
                data: summary,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/dashboard/films
     * Get film-wise performance.
     */
    async getFilmPerformance(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const performance = await reportService.getFilmPerformance(startDate, endDate);

            res.status(200).json({
                success: true,
                data: performance,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/dashboard/screens
     * Get screen-wise performance.
     */
    async getScreenPerformance(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const performance = await reportService.getScreenPerformance(startDate, endDate);

            res.status(200).json({
                success: true,
                data: performance,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/dashboard/concessions
     * Get concession-wise performance.
     */
    async getConcessionPerformance(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const performance = await reportService.getConcessionPerformance(startDate, endDate);

            res.status(200).json({
                success: true,
                data: performance,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/dashboard/trends
     * Get daily trends for charts.
     */
    async getTrends(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const trends = await reportService.getTrends(startDate, endDate);

            res.status(200).json({
                success: true,
                data: trends,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/reports/export/excel
     * Export report to Excel.
     */
    async exportExcel(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const buffer = await reportExportService.exportExcel(startDate, endDate);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Cinema_Report_${startDate || 'start'}_${endDate || 'end'}.xlsx"`);
            res.status(200).send(buffer);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/reports/export/pdf
     * Export report to PDF.
     */
    async exportPdf(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const buffer = await reportExportService.exportPdf(startDate, endDate);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Cinema_Report_${startDate || 'start'}_${endDate || 'end'}.pdf"`);
            res.status(200).send(buffer);
        } catch (error) {
            next(error);
        }
    }


}

export default new ReportController();
