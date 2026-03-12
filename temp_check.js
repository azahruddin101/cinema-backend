import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Report from './src/models/report.model.js';

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const earliest = await Report.findOne().sort({ date: 1 });
    const latest = await Report.findOne().sort({ date: -1 });
    const count2024 = await Report.countDocuments({ date: { $regex: '^2024' } });
    
    console.log('Earliest report:', earliest ? earliest.date : 'none');
    console.log('Latest report:', latest ? latest.date : 'none');
    console.log('Report count for 2024:', count2024);
    
    await mongoose.connection.close();
}

check();
