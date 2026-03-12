import cron from 'node-cron';
import scraperService from './scraper.service.js';

/**
 * Initialize all scraper cron jobs.
 */
export function initCronJobs() {
    const enableCrons = process.env.ENABLE_CRONS === 'true';
    const enableBackward = process.env.ENABLE_BACKWARD_CRAWLER === 'true';

    if (!enableCrons) {
        console.log('⚠️  Cron jobs are DISABLED (ENABLE_CRONS is not true).');
        return;
    }

    // ─── Backward Crawler Cron ───────────────────────────────────
    if (enableBackward) {
        // Runs every 20 seconds to fetch reports in reverse chronological order.
        cron.schedule(
            '0 */10 * * * *',
            async () => {
            console.log('\n⏰ ═══════════════════════════════════════');
            console.log('⏰ Backward crawler cron job triggered at', new Date().toISOString());
            console.log('⏰ ═══════════════════════════════════════\n');

            try {
                // Fetch the next target day going backwards
                const result = await scraperService.scrapeNextBackwardDay();
                console.log('✅ Backward crawler cron completed:', result.date || result._id || 'skipped');
            } catch (error) {
                console.error('❌ Backward crawler cron failed:', error.message);
            }
        },
        {
            scheduled: true,
            timezone: 'Asia/Kolkata', // IST
        }
        );
    } else {
        console.log('ℹ️  Backward report crawler is DISABLED.');
    }

    // ─── Forward Daily Scraper Cron ──────────────────────────────
    const enableDaily = process.env.ENABLE_DAILY_SCRAPER === 'true';
    if (enableDaily) {
    // Runs once a day at 5:00 AM IST to fetch yesterday's report.
    cron.schedule(
        '0 5 * * *',
        async () => {
            console.log('\n⏩ ═══════════════════════════════════════');
            console.log('⏩ Daily forward scraper triggered at', new Date().toISOString());
            console.log('⏩ ═══════════════════════════════════════\n');

            try {
                const result = await scraperService.scrapeYesterday();
                console.log('✅ Daily forward scraper completed:', result.date);
            } catch (error) {
                console.error('❌ Daily forward scraper failed:', error.message);
            }
        },
        {
            scheduled: true,
            timezone: 'Asia/Kolkata', // IST
        }
        );
    } else {
        console.log('ℹ️  Daily forward scraper is DISABLED.');
    }

    console.log('⏰ Cron jobs initialized:');
    console.log('   • Backward report crawler → Every 1 min (approx)');
    console.log('   • Daily forward scraper → 05:00 AM IST');
}

export default { initCronJobs };
