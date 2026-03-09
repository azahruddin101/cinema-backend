import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Report from '../models/report.model.js';

async function resetDB() {
    try {
        console.log(`📡 Connecting to MongoDB: ${process.env.MONGO_URI}`);
        await mongoose.connect(process.env.MONGO_URI);

        console.log('🗑️  Dropping all reports...');
        await Report.deleteMany({});
        console.log('✅ Reports collection successfully cleared.');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Reset failed:', error.message);
        process.exit(1);
    }
}

resetDB();
