import dotenv from 'dotenv';

// Load .env BEFORE any other imports that rely on env vars
dotenv.config();

import app from './app.js';
import connectDB from './config/database.js';
import { initCronJobs } from './modules/scraper/scraper.cron.js';
import { initChatbotCrons } from './modules/chatbot/chatbot.cron.js';

const PORT = process.env.PORT || 5000;

/**
 * Start the server.
 */
async function startServer() {
    try {
        // 1. Connect to MongoDB
        await connectDB();

        // 2. Initialize cron jobs
        initCronJobs();
        initChatbotCrons();

        // 3. Start Express server
        const server = app.listen(PORT, () => {
            console.log(`\n🎬 ═══════════════════════════════════════════════`);
            console.log(`🎬  Cinema MIS Dashboard API`);
            console.log(`🎬  Environment : ${process.env.NODE_ENV || 'development'}`);
            console.log(`🎬  Port        : ${PORT}`);
            console.log(`🎬  API Docs    : http://localhost:${PORT}/api/docs`);
            console.log(`🎬  Health      : http://localhost:${PORT}/api/health`);
            console.log(`🎬 ═══════════════════════════════════════════════\n`);
        });

        // ─── Graceful shutdown ─────────────────────────────────
        const gracefulShutdown = (signal) => {
            console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
            server.close(() => {
                console.log('🛑 HTTP server closed.');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('❌ Forced shutdown after timeout.');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle unhandled rejections
        process.on('unhandledRejection', (reason) => {
            console.error('❌ Unhandled Rejection:', reason);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            process.exit(1);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();
