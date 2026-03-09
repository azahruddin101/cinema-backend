import Report from '../../models/report.model.js';
import { AppError } from '../../middleware/error.middleware.js';

class ReportService {
    /**
     * Get report for a specific date.
     * @param {string} date - YYYY-MM-DD
     */
    async getByDate(date) {
        const report = await Report.findOne({ date });
        if (!report) {
            throw new AppError(`No report found for date: ${date}`, 404);
        }
        return report;
    }

    /**
     * Get reports in a date range.
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate   - YYYY-MM-DD
     */
    async getByDateRange(startDate, endDate) {
        const reports = await Report.find({
            date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 });

        return reports;
    }

    /**
     * Get dashboard summary statistics.
     * Optionally scoped to a date range, defaults to last 30 days.
     */
    async getSummary(startDate, endDate) {
        // Default to last 30 days
        if (!startDate || !endDate) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            endDate =
                endDate ||
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            startDate =
                startDate ||
                `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
        }

        const reports = await Report.find({
            date: { $gte: startDate, $lte: endDate },
        });

        if (reports.length === 0) {
            return {
                period: { startDate, endDate },
                totalDays: 0,
                totalShows: 0,
                totalTickets: 0,
                totalBoxOffice: 0,
                totalConcessions: 0,
                totalRevenue: 0,
                averageOccupancy: 0,
            };
        }

        let totalShows = 0;
        let totalTickets = 0;
        let totalBoxOffice = 0;
        let totalConcessions = 0;
        let occupancySum = 0;
        let filmCount = 0;

        for (const report of reports) {
            totalShows += report.totals?.shows || 0;
            totalTickets += report.totals?.ticketsSold || 0;
            totalConcessions += report.totals?.totalConcessionValue || 0;

            for (const f of report.films) {
                totalBoxOffice += f.grossAmount || 0;
                occupancySum += f.occupancyPercent || 0;
                filmCount++;
            }
        }

        return {
            period: { startDate, endDate },
            totalDays: reports.length,
            totalShows,
            totalTickets,
            totalBoxOffice: parseFloat(totalBoxOffice.toFixed(2)),
            totalConcessions: parseFloat(totalConcessions.toFixed(2)),
            totalRevenue: parseFloat((totalBoxOffice + totalConcessions).toFixed(2)),
            averageOccupancy: filmCount > 0 ? parseFloat((occupancySum / filmCount).toFixed(2)) : 0
        };
    }

    /**
     * Get film-wise performance aggregated over a date range.
     */
    async getFilmPerformance(startDate, endDate) {
        // Default to last 30 days
        if (!startDate || !endDate) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            endDate =
                endDate ||
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            startDate =
                startDate ||
                `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
        }

        const pipeline = [
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            { $unwind: '$films' },
            {
                $group: {
                    _id: '$films.film',
                    totalShows: { $sum: '$films.shows' },
                    totalSold: { $sum: '$films.ticketsSold' },
                    avgOccupancy: { $avg: '$films.occupancyPercent' },
                    totalGross: { $sum: '$films.grossAmount' },
                    totalNet: { $sum: '$films.netAmount' },
                    daysActive: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    film: '$_id',
                    totalShows: 1,
                    totalSold: 1,
                    avgOccupancy: { $round: ['$avgOccupancy', 2] },
                    totalGross: { $round: ['$totalGross', 2] },
                    totalNet: { $round: ['$totalNet', 2] },
                    daysActive: 1,
                },
            },
            { $sort: { totalGross: -1 } },
        ];

        const results = await Report.aggregate(pipeline);
        return {
            period: { startDate, endDate },
            films: results,
        };
    }

    /**
     * Get screen-wise performance aggregated over a date range.
     */
    async getScreenPerformance(startDate, endDate) {
        if (!startDate || !endDate) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            endDate = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            startDate = startDate || `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
        }

        const pipeline = [
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            { $unwind: '$screens' },
            {
                $group: {
                    _id: '$screens.screen',
                    totalShows: { $sum: '$screens.shows' },
                    totalSold: { $sum: '$screens.ticketsSold' },
                    totalGross: { $sum: '$screens.grossAmount' },
                    totalNet: { $sum: '$screens.netAmount' },
                    daysActive: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    screen: '$_id',
                    totalShows: 1,
                    totalSold: 1,
                    totalGross: { $round: ['$totalGross', 2] },
                    totalNet: { $round: ['$totalNet', 2] },
                    daysActive: 1,
                },
            },
            { $sort: { totalGross: -1 } },
        ];

        const results = await Report.aggregate(pipeline);
        return {
            period: { startDate, endDate },
            screens: results,
        };
    }

    /**
     * Get concession-wise performance aggregated over a date range.
     */
    async getConcessionPerformance(startDate, endDate) {
        if (!startDate || !endDate) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            endDate = endDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            startDate = startDate || `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
        }

        const pipeline = [
            {
                $match: {
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            { $unwind: '$concessions' },
            {
                $group: {
                    _id: '$concessions.itemClass',
                    totalTransCount: { $sum: '$concessions.transCount' },
                    totalQtySold: { $sum: '$concessions.qtySold' },
                    totalSaleValue: { $sum: '$concessions.saleValue' },
                    daysActive: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    itemClass: '$_id',
                    totalTransCount: 1,
                    totalQtySold: 1,
                    totalSaleValue: { $round: ['$totalSaleValue', 2] },
                    daysActive: 1,
                },
            },
            { $sort: { totalSaleValue: -1 } },
        ];

        const results = await Report.aggregate(pipeline);
        return {
            period: { startDate, endDate },
            concessions: results,
        };
    }

    /**
     * Get daily trends (ticket sales, revenue, occupancy) for charts.
     */
    async getTrends(startDate, endDate) {
        // Default to last 30 days
        if (!startDate || !endDate) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            endDate =
                endDate ||
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            startDate =
                startDate ||
                `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
        }

        const reports = await Report.find({
            date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 });

        const trends = reports.map((report) => {
            let dailyBoxOffice = 0;

            for (const f of report.films) {
                dailyBoxOffice += f.grossAmount || 0;
            }

            const dailyConcessions = report.totals?.totalConcessionValue || 0;

            return {
                date: report.date,
                tickets: report.totals?.ticketsSold || 0,
                shows: report.totals?.shows || 0,
                boxOffice: parseFloat(dailyBoxOffice.toFixed(2)),
                concessions: parseFloat(dailyConcessions.toFixed(2)),
                revenue: parseFloat((dailyBoxOffice + dailyConcessions).toFixed(2)),
                avgOccupancy: report.totals?.avgOccupancy || 0
            };
        });

        return {
            period: { startDate, endDate },
            trends,
        };
    }
}

export default new ReportService();
