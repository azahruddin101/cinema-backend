import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import scraperService from '../modules/scraper/scraper.service.js';

async function testFill() {
    try {
        console.log(`📡 Connecting to MongoDB...`);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Test with a date closer to existing data
        const start = '2024-08-20';
        const end = '2024-08-21';

        console.log(`\n🚀 Testing gap fill for ${start} to ${end}...`);
        const result = await scraperService.backfill(start, end);
        
        console.log('\n📊 Test Result:', result);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

testFill();
