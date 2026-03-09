/**
 * Seed script – creates an initial admin user.
 *
 * Usage: npm run seed
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/user.model.js';

const ADMIN_USER = {
    name: 'Admin',
    email: 'admin@cinema.com',
    password: 'admin123',
    role: 'admin',
};

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existing = await User.findOne({ email: ADMIN_USER.email });
        if (existing) {
            console.log('⏭️  Admin user already exists. Skipping seed.');
        } else {
            await User.create(ADMIN_USER);
            console.log('✅ Admin user created:');
            console.log(`   Email    : ${ADMIN_USER.email}`);
            console.log(`   Password : ${ADMIN_USER.password}`);
            console.log(`   Role     : ${ADMIN_USER.role}`);
        }

        await mongoose.connection.close();
        console.log('✅ Database connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
