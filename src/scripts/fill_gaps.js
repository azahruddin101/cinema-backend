import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import scraperService from '../modules/scraper/scraper.service.js';

async function fillGaps() {
    try {
        console.log(`📡 Connecting to MongoDB...`);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const gaps = [
            { start: '2024-01-01', end: '2024-08-23' },
            { start: '2025-03-08', end: '2025-10-31' }
        ];

        console.log('\n🚀 Starting gap-filling process...');
        
        for (const gap of gaps) {
            console.log(`\n📂 Filling gap: ${gap.start} to ${gap.end}`);
            const result = await scraperService.backfill(gap.start, gap.end);
            console.log(`✅ Gap ${gap.start} to ${gap.end} matching completed:`, {
                total: result.total,
                success: result.success,
                failed: result.failed,
                skipped: result.skipped
            });
        }

        console.log('\n✨ All gaps processed!');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Gap filling failed:', error.message);
        process.exit(1);
    }
}

fillGaps();
