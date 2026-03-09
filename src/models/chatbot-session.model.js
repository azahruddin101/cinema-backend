import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const chatbotSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            default: 'New Chat',
        },
        messages: [messageSchema],
        metadata: {
            lastActivity: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true,
    }
);

// Index for performance
chatbotSessionSchema.index({ userId: 1, createdAt: -1 });

const ChatbotSession = mongoose.model('ChatbotSession', chatbotSessionSchema);

export default ChatbotSession;
