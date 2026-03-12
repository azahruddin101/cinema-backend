import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Report from './src/models/report.model.js';

async function findMissing() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const start = new Date('2024-01-01');
    const end = new Date(); // Today
    
    const existingDates = await Report.find({
        date: { $gte: '2024-01-01' }
    }).select('date').lean();
    
    const dateSet = new Set(existingDates.map(r => r.date));
    
    const missing = [];
    let current = new Date(start);
    
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (!dateSet.has(dateStr)) {
            missing.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
    }
    
    console.log('Total missing dates from 2024-01-01 to today:', missing.length);
    if (missing.length > 0) {
        console.log('First 10 missing:', missing.slice(0, 10));
        console.log('Last 10 missing:', missing.slice(-10));
        
        // Count per year
        const counts = {};
        missing.forEach(d => {
            const year = d.split('-')[0];
            counts[year] = (counts[year] || 0) + 1;
        });
        console.log('Missing counts by year:', counts);
    }
    
    await mongoose.connection.close();
}

findMissing();
