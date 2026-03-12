import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import scraperService from '../modules/scraper/scraper.service.js';

async function fillMissingAll() {
    try {
        console.log(`📡 Connecting to MongoDB...`);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const end = new Date().toISOString().split('T')[0];
        const start = '2024-01-01';

        console.log(`\n🚀 Starting full backfill from ${start} to ${end}...`);
        console.log(`💡 Existing reports will be skipped automatically.`);
        
        const result = await scraperService.backfill(start, end, false);
        
        console.log('\n📊 Final Result:', {
            total: result.total,
            success: result.success,
            skipped: result.skipped,
            failed: result.failed
        });

        if (result.failed > 0) {
            console.log('❌ Failed dates count:', result.failed);
            // Optionally log first few errors
            console.log('Sample errors:', result.errors.slice(0, 5));
        }

        console.log('\n✨ Database backfill completed.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Backfill failed:', error.message);
        process.exit(1);
    }
}

fillMissingAll();
