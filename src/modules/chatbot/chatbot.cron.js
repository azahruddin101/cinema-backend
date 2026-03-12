import cron from 'node-cron';
import chatbotService from './chatbot.service.js';

/**
 * Initialize chatbot-related cron jobs.
 */
export function initChatbotCrons() {
    const enableChatbot = process.env.ENABLE_CHATBOT_CRONS === 'true';

    if (!enableChatbot) {
        console.log('🤖 Chatbot crons are DISABLED (ENABLE_CHATBOT_CRONS is not true).');
        return;
    }

    // ─── Daily Indexing Cron ──────────────────────────────────────
    // Runs at 6:00 AM every day to refresh the vector store with all MongoDB reports.
    cron.schedule(
        '0 6 * * *',
        async () => {
            console.log('\n🤖 ═══════════════════════════════════════');
            console.log('🤖 Chatbot daily indexing triggered at', new Date().toISOString());
            console.log('🤖 ═══════════════════════════════════════\n');

            try {
                // Perform a fresh indexing of all data into Qdrant
                await chatbotService.initializeVectorStore();
                console.log('✅ Chatbot daily indexing completed.');
            } catch (error) {
                console.error('❌ Chatbot daily indexing failed:', error.message);
            }
        },
        {
            scheduled: true,
            timezone: 'Asia/Kolkata', // IST
        }
    );

    console.log('🤖 Chatbot crons initialized:');
    console.log('   • Daily indexing → 06:00 AM IST');
}

export default { initChatbotCrons };
