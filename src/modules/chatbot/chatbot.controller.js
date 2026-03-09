import chatbotService from './chatbot.service.js';

/**
 * @desc    Ask the chatbot a question based on reports
 * @route   POST /api/chatbot/ask
 * @access  Private/Admin
 */
export const askChatbot = async (req, res, next) => {
    try {
        const { question, sessionId } = req.body;
        const userId = req.user.id;

        if (!question || question.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a question.'
            });
        }

        const result = await chatbotService.ask(question, userId, sessionId);

        res.status(200).json({
            success: true,
            data: {
                ...result,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all chat sessions for the current user
 * @route   GET /api/chatbot/sessions
 * @access  Private/Admin
 */
export const getChatSessions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessions = await chatbotService.getSessions(userId);
        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get message history for a specific session
 * @route   GET /api/chatbot/sessions/:sessionId
 * @access  Private/Admin
 */
export const getChatHistory = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const messages = await chatbotService.getSessionMessages(sessionId);
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Re-sync/Initialize vector store
 * @route   POST /api/chatbot/sync
 * @access  Private/Admin
 */
export const syncChatbotData = async (req, res, next) => {
    try {
        await chatbotService.initializeVectorStore();
        res.status(200).json({
            success: true,
            message: 'Chatbot datastore synchronized with MongoDB reports.'
        });
    } catch (error) {
        next(error);
    }
};
