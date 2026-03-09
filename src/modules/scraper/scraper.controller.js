import scraperService from './scraper.service.js';

class ScraperController {
    /**
     * POST /api/scraper/backfill
     * Trigger a backfill of historical data.
     */
    async backfill(req, res, next) {
        try {
            const { startDate, endDate, overwrite } = req.body;

            const results = await scraperService.backfill(
                startDate,
                endDate,
                overwrite || false
            );

            res.status(200).json({
                success: true,
                message: 'Backfill operation completed',
                data: results,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/scraper/scrape-day
     * Scrape a specific day's report.
     */
    async scrapeDay(req, res, next) {
        try {
            const { date, overwrite } = req.body;

            const result = await scraperService.scrapeAndSave(date, overwrite || false);

            res.status(200).json({
                success: true,
                message: result.skipped
                    ? `Report for ${date} already exists (skipped)`
                    : `Report for ${date} scraped successfully`,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new ScraperController();
