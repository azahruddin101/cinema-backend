import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/database.js';
import chatbotService from '../modules/chatbot/chatbot.service.js';

/**
 * Manual script to sync/re-index the chatbot vector store with latest MongoDB data.
 * Run this whenever you want to ensure the chatbot has the most up-to-date information.
 * 
 * Usage: node src/scripts/sync_chatbot.js
 */
async function syncChatbot() {
    try {
        console.log('🔄 Starting manual chatbot synchronization...\n');
        
        // Connect to MongoDB
        await connectDB();
        
        // Initialize/refresh the vector store
        await chatbotService.initializeVectorStore();
        
        console.log('\n✅ Chatbot synchronization completed successfully!');
        console.log('   The chatbot now has access to all the latest data from MongoDB.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Chatbot synchronization failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

syncChatbot();
