import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import scraperService from '../modules/scraper/scraper.service.js';

async function testScrape() {
    try {
        console.log(`📡 Connecting to MongoDB: ${process.env.MONGO_URI}`);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n🚀 Forcing a single backward scrape...');
        const result = await scraperService.scrapeNextBackwardDay();
        console.log(`✅ Scrape finished: ${result.date || result._id || 'skipped'}`);

        await mongoose.connection.close();
        console.log('✅ Database connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Scrape failed:', error.message);
        process.exit(1);
    }
}

testScrape();
