import axios from 'axios';
import Report from '../../models/report.model.js';
import { parseFilmsHTML, parseScreensHTML, parseConcessionsHTML } from '../../utils/parser.utils.js';
import chatbotService from '../chatbot/chatbot.service.js';
import {
    formatDateISO,
    parseDateISO,
    addDays,
    getMISDateRange,
    getDateRange,
    getYesterday,
    sleep,
} from '../../utils/date.utils.js';

class ScraperService {
    constructor() {
        this.baseURL = process.env.MIS_BASE_URL || '';
        this.delayMs = parseInt(process.env.SCRAPER_DELAY_MS, 10) || 3000;
    }

    /**
     * Fetch raw HTML reports from the MIS endpoint for a given date.
     * Hits Revenue (Films), Patrons (Films), Revenue (Screens), and Concessions views.
     * @param {string} dateStr - YYYY-MM-DD format.
     * @param {number} retries - Number of retries for timeouts.
     * @returns {Promise<{revenueHtml: string, patronsHtml: string, screensHtml: string, concessionsHtml: string}>}
     */
    async fetchReportHTMLs(dateStr, retries = 3) {
        const { from, to } = getMISDateRange(dateStr);

        const baseURL = process.env.MIS_BASE_URL || this.baseURL || '';
        const url = `${baseURL}/Ajax.aspx`;

        const baseParams = {
            dt: 'GetReport',
            RptFormat: 'Generate',
            FromDate: from,
            FilmCode: '',
            ToDate: to,
            FilmWiseORScreenWise: 'F' // Change to Film wise
        };

        const config = {
            timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS, 10) || 60000, // Increased default timeout to 60s
            headers: {
                'User-Agent': 'CinemaMIS-Scraper/1.0',
                Accept: 'text/html, application/xhtml+xml',
            },
        };

        const fetchWithRetry = async (params, label) => {
            for (let i = 0; i <= retries; i++) {
                try {
                    console.log(`🔗 Request URL (${label}): ${url}?${new URLSearchParams(params).toString()}`);
                    const response = await axios.get(url, { params, ...config });
                    return response.data;
                } catch (error) {
                    const isTimeout = error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout');
                    if (isTimeout && i < retries) {
                        const waitTime = (i + 1) * 5000;
                        console.warn(`⚠️  Timeout on ${label}. Retrying in ${waitTime / 1000}s... (${i + 1}/${retries})`);
                        await sleep(waitTime);
                        continue;
                    }
                    throw error;
                }
            }
        };

        console.log(`📡 Fetching MIS report for ${dateStr} (From: ${from}, To: ${to})`);

        try {
            const revenueHtml = await fetchWithRetry({ ...baseParams, RType: 'Revenue', FilmWiseORScreenWise: 'F' }, 'Revenue-Films');
            const patronsHtml = await fetchWithRetry({ ...baseParams, RType: 'Patrons', FilmWiseORScreenWise: 'F' }, 'Patrons-Films');
            const screensHtml = await fetchWithRetry({ ...baseParams, RType: 'Revenue', FilmWiseORScreenWise: 'S' }, 'Revenue-Screens');
            const concessionsHtml = await fetchWithRetry({ ...baseParams, RType: 'Concession', FilmWiseORScreenWise: 'F' }, 'Concessions');

            return { revenueHtml, patronsHtml, screensHtml, concessionsHtml };
        } catch (error) {
            const status = error.response?.status;
            const msg = error.message;
            console.error(`❌ Failed to fetch report for ${dateStr}: [${status || 'TIMEOUT'}] ${msg}`);
            throw new Error(`Failed to fetch MIS report for ${dateStr}: ${msg}`);
        }
    }

    /**
     * Scrape and store a single day's report.
     * @param {string} dateStr - YYYY-MM-DD format.
     * @param {boolean} overwrite - If true, replace existing report for the date.
     * @returns {Promise<object>} The saved report document.
     */
    async scrapeAndSave(dateStr, overwrite = false) {
        // Check if report already exists
        const existing = await Report.findOne({ date: dateStr });

        if (existing && !overwrite) {
            console.log(`⏭️  Report for ${dateStr} already exists. Skipping.`);
            return { skipped: true, date: dateStr };
        }

        // Fetch HTMLs from MIS
        const { revenueHtml, patronsHtml, screensHtml, concessionsHtml } = await this.fetchReportHTMLs(dateStr);

        // Parse HTML to structured data
        const films = parseFilmsHTML(revenueHtml, patronsHtml);
        const screens = parseScreensHTML(screensHtml);
        const concessions = parseConcessionsHTML(concessionsHtml);

        if (films.length === 0) {
            console.warn(`⚠️  No film data found for ${dateStr}. Saving empty report.`);
        }

        // Save or update
        let saved;
        if (existing && overwrite) {
            existing.films = films;
            existing.screens = screens;
            existing.concessions = concessions;
            saved = await existing.save(); // triggers pre-save hook for totals
            console.log(`🔄 Report for ${dateStr} updated (${films.length} films, ${screens.length} screens, ${concessions.length} concessions).`);
        } else {
            const report = new Report({
                date: dateStr,
                films,
                screens,
                concessions
            });
            saved = await report.save();
            console.log(`✅ Report for ${dateStr} saved (${films.length} films, ${screens.length} screens, ${concessions.length} concessions).`);
        }

        // Trigger incremental indexing to Chatbot (background) for both new and updated reports
        chatbotService.indexSingleReport(saved).catch(err =>
            console.error(`⚠️  Chatbot auto-indexing failed for ${dateStr}:`, err.message)
        );

        return saved;
    }

    /**
     * Scrape the day before the earliest currently stored report (Backwards crawler).
     * If database is empty, it starts from yesterday.
     */
    async scrapeNextBackwardDay() {
        // Find the earliest report date in the DB
        const earliestReport = await Report.findOne()
            .sort({ date: 1 }) // Ascending order
            .select('date');

        let targetDateObj;

        if (earliestReport && earliestReport.date) {
            // Parse earliest date and subtract 1 day
            const earliestDate = parseDateISO(earliestReport.date);
            targetDateObj = addDays(earliestDate, -1);
            console.log(`\n⏪ Backward cron: Earliest report is ${earliestReport.date}, targeting 1 day before...`);
        } else {
            // Start from yesterday if DB empty
            targetDateObj = getYesterday();
            console.log(`\n⏪ Backward cron: DB empty, starting from yesterday...`);
        }

        const targetDateStr = formatDateISO(targetDateObj);
        return this.scrapeAndSave(targetDateStr);
    }

    /**
     * Scrape yesterday's report (for daily cron).
     */
    async scrapeDailyReport() {
        const yesterday = getYesterday();
        const dateStr = formatDateISO(yesterday);

        console.log(`\n🕐 Daily cron: scraping report for ${dateStr}`);
        return this.scrapeAndSave(dateStr, true); // true to overwrite if partial data existed
    }

    /**
     * Scrape yesterday's report (Alias for daily cron logic)
     */
    async scrapeYesterday() {
        return this.scrapeDailyReport();
    }

    /**
     * Backfill a date range.
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate   - YYYY-MM-DD
     * @param {boolean} overwrite
     * @param {boolean} stopOnError - If true, stop the backfill process on first error to prevent gaps.
     * @returns {Promise<object>} Summary of the backfill operation.
     */
    async backfill(startDate, endDate, overwrite = false, stopOnError = true) {
        const dates = getDateRange(startDate, endDate);
        console.log(
            `\n📅 Backfill started: ${startDate} → ${endDate} (${dates.length} days)\n`
        );

        const results = {
            total: dates.length,
            success: 0,
            skipped: 0,
            failed: 0,
            errors: [],
        };

        for (let i = 0; i < dates.length; i++) {
            const dateStr = dates[i];
            let result;
            try {
                result = await this.scrapeAndSave(dateStr, overwrite);
                if (result.skipped) {
                    results.skipped++;
                } else {
                    results.success++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ date: dateStr, error: error.message });
                console.error(`❌ Backfill error for ${dateStr}: ${error.message}`);
                
                if (stopOnError) {
                    console.log(`🛑 Stopping backfill to prevent data gaps. Please check the error and restart the script.`);
                    throw error;
                }
            }

            // Delay between requests to prevent rate limiting (except on the last one or if skipped)
            if (i < dates.length - 1 && (!result || !result.skipped)) {
                console.log(`⏳ Waiting ${this.delayMs}ms before next request...`);
                await sleep(this.delayMs);
            }
        }

        console.log(`\n📊 Backfill complete:`, {
            total: results.total,
            success: results.success,
            skipped: results.skipped,
            failed: results.failed,
        });

        return results;
    }
}

export default new ScraperService();
