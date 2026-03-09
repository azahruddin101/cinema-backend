import express from 'express';
import { askChatbot, syncChatbotData, getChatSessions, getChatHistory } from './chatbot.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: AI Assistant based on Cinema Statistics
 */

/**
 * @swagger
 * /api/chatbot/ask:
 *   post:
 *     summary: Ask a question to the AI Assistant based on historical reports
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI-generated answer based on report context
 */
router.post('/ask', authenticate, authorizeRoles('admin'), askChatbot);

/**
 * @swagger
 * /api/chatbot/sessions:
 *   get:
 *     summary: Get all previous chat sessions
 *     tags: [Chatbot]
 */
router.get('/sessions', authenticate, authorizeRoles('admin'), getChatSessions);

/**
 * @swagger
 * /api/chatbot/sessions/{sessionId}:
 *   get:
 *     summary: Get history for a specific session
 *     tags: [Chatbot]
 */
router.get('/sessions/:sessionId', authenticate, authorizeRoles('admin'), getChatHistory);

/**
 * @swagger
 * /api/chatbot/sync:
 *   post:
 *     summary: Re-sync the vector database with latest reports
 *     tags: [Chatbot]
 */
router.post('/sync', authenticate, authorizeRoles('admin'), syncChatbotData);

export default router;
