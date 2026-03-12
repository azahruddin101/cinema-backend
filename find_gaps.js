import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Report from './src/models/report.model.js';

async function findGaps() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const start = new Date('2024-01-01');
    const end = new Date();
    
    const reports = await Report.find({
        date: { $gte: '2024-01-01' }
    }).sort({ date: 1 }).select('date').lean();
    
    const gaps = [];
    let lastDate = new Date(start);
    lastDate.setDate(lastDate.getDate() - 1); // Start before
    
    for (const report of reports) {
        const currentReportDate = new Date(report.date);
        
        // Calculate difference in days
        const diff = (currentReportDate - lastDate) / (1000 * 60 * 60 * 24);
        
        if (diff > 1) {
            // There is a gap
            const gapStart = new Date(lastDate);
            gapStart.setDate(gapStart.getDate() + 1);
            const gapEnd = new Date(currentReportDate);
            gapEnd.setDate(gapEnd.getDate() - 1);
            
            gaps.push({
                start: gapStart.toISOString().split('T')[0],
                end: gapEnd.toISOString().split('T')[0],
                days: diff - 1
            });
        }
        lastDate = currentReportDate;
    }
    
    // Check if there's a gap after the last report
    const today = new Date();
    today.setHours(0,0,0,0);
    if (lastDate < today) {
        const gapStart = new Date(lastDate);
        gapStart.setDate(gapStart.getDate() + 1);
        const gapEnd = new Date(today);
        gapEnd.setDate(gapEnd.getDate() - 1);
        const diff = (gapEnd - gapStart) / (1000 * 60 * 60 * 24) + 1;
        if (diff > 0) {
            gaps.push({
                start: gapStart.toISOString().split('T')[0],
                end: gapEnd.toISOString().split('T')[0],
                days: diff
            });
        }
    }
    
    console.log('Gaps found:');
    gaps.forEach(g => {
        console.log(`- ${g.start} to ${g.end} (${g.days} days)`);
    });
    
    await mongoose.connection.close();
}

findGaps();
