import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import scraperService from '../modules/scraper/scraper.service.js';

async function fill2024() {
    try {
        console.log(`📡 Connecting to MongoDB...`);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const start = '2024-01-01';
        const end = '2024-12-31';

        console.log(`\n🚀 Starting full backfill for the year 2024...`);
        console.log(`📅 Range: ${start} to ${end}`);
        console.log(`💡 Existing reports will be skipped.`);
        
        const result = await scraperService.backfill(start, end, false);
        
        console.log('\n📊 Final Result for 2024:', {
            total: result.total,
            success: result.success,
            skipped: result.skipped,
            failed: result.failed
        });

        if (result.failed > 0) {
            console.log('❌ Failed dates:', result.errors);
        }

        console.log('\n✨ Backfill process completed.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Backfill failed:', error.message);
        process.exit(1);
    }
}

fill2024();
