const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { chatRateLimiterMiddleware } = require('../middleware/rateLimiter');
const safetyFilter = require('../middleware/safetyFilter');
const { generateChatResponse } = require('../utils/openai');

const Chat = require('../models/Chat');
const Analytics = require('../models/Analytics');

// Allowed configs
const allowedBotRoles = [
  'assistant',
  'student-helper',
  'fitness-coach',
  'coding-assistant',
  'medical-advisor',
  'financial-advisor',
  'creative-writer'
];
const allowedLanguages = ['en', 'hi', 'es', 'fr', 'de', 'zh'];

// Helpers
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id || '');

// ============================================
// POST /api/chat/new - Create a new chat
// ============================================
router.post('/new', protect, safetyFilter, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const { systemPrompt, botRole, language } = req.body || {};
    const safeBotRole = allowedBotRoles.includes(botRole) ? botRole : 'assistant';
    const safeLanguage = allowedLanguages.includes(language) ? language : 'en';

    const chat = await Chat.create({
      user: req.user.id,
      systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
      botRole: safeBotRole,
      language: safeLanguage,
      messages: []
    });

    return res.status(201).json({ success: true, chat });
  } catch (error) {
    console.error('Create Chat Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to create new chat' });
    }
  }
});

// ============================================
// GET /api/chat - List chats for the user
// ============================================
router.get('/', protect, async (req, res) => {
  try {
    const { archived, page = 1, limit = 20 } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const query = { user: req.user.id, isArchived: archived === 'true' };

    const [chats, total] = await Promise.all([
      Chat.find(query)
        .sort({ updatedAt: -1 })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit),
      Chat.countDocuments(query)
    ]);

    return res.json({
      success: true,
      chats,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Get Chats Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to fetch chats' });
    }
  }
});

// ============================================
// GET /api/chat/:chatId - Get a single chat
// ============================================
router.get('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: 'Invalid chat id' });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user.id
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    return res.json({ success: true, chat });
  } catch (error) {
    console.error('Get Chat Detail Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to fetch chat' });
    }
  }
});

// ============================================
// POST /api/chat/:chatId/message (SSE streaming)
// ============================================
router.post('/:chatId/message', protect, chatRateLimiterMiddleware, safetyFilter, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: 'Invalid chat id' });
    }

    const { content, fileAttachments } = req.body || {};

    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user.id
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Append user message
    chat.messages.push({
      role: 'user',
      content,
      timestamp: new Date(),
      fileAttachments: fileAttachments || []
    });
    await chat.save();

    // Prepare messages for AI (last 10)
    const messagesForAI = chat.messages.slice(-10);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const startTime = Date.now();
    let fullResponse = '';
    let tokenCount = 0;
    let streamEnded = false;

    try {
      const stream = await generateChatResponse(messagesForAI, {
  // Let the util pick DEFAULT_MODEL from env, or explicitly set a Groq model:
  // model: process.env.GROQ_MODEL || 'llama3-8b-8192',
      temperature: 0.7,
      maxTokens: 1000,
      stream: true,
      botRole: chat.botRole,
      language: chat.language

      });

      for await (const chunk of stream) {
        const piece = chunk?.choices?.[0]?.delta?.content || '';
        if (piece) {
          fullResponse += piece;
          tokenCount++;
          res.write(`data: ${JSON.stringify({ content: piece })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      streamEnded = true;

      // Save assistant response
      chat.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        metadata: { model: 'gpt-3.5-turbo', tokens: tokenCount }
      });
      await chat.save();

      await updateAnalytics(req.user.id, chat, fullResponse, tokenCount, Date.now() - startTime);

      res.end();
      return;
    } catch (streamError) {
      console.error('Stream Generation Error:', streamError);
      const errorMsg =
        streamError?.code === 'insufficient_quota'
          ? 'AI quota exceeded. Please try again later.'
          : streamError?.message || 'Failed to generate response';

      if (!streamEnded) {
        res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      }
      if (!res.closed) {
        try {
          res.end();
        } catch (_) {}
      }
      return;
    }
  } catch (error) {
    console.error('Send Message Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to send message' });
    }
  }
});

// ============================================
// TEMP FALLBACK: POST /api/chat/:chatId/message-fallback
// Use when OpenAI quota is exceeded to keep UX working
// ============================================
router.post('/:chatId/message-fallback', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: 'Invalid chat id' });
    }

    const { content, fileAttachments } = req.body || {};
    const chat = await Chat.findOne({ _id: chatId, user: req.user.id });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Append user message
    chat.messages.push({
      role: 'user',
      content: content || '',
      timestamp: new Date(),
      fileAttachments: fileAttachments || []
    });

    // Fake assistant response for quota outage
    const reply = `⚠️ AI is temporarily unavailable (quota exceeded). Your message was received:\n\n"${content || ''}"`;
    chat.messages.push({
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
      metadata: { model: 'fallback', tokens: 0 }
    });

    await chat.save();
    return res.json({ success: true, chat });
  } catch (err) {
    console.error('Fallback Send Message Error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to send message (fallback)' });
    }
  }
});

// ============================================
// PUT /api/chat/:chatId - Update chat metadata
// ============================================
router.put('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: 'Invalid chat id' });
    }

    const { title, systemPrompt, botRole, language } = req.body || {};

    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user.id
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    if (title) chat.title = title;
    if (systemPrompt) chat.systemPrompt = systemPrompt;
    if (botRole && allowedBotRoles.includes(botRole)) chat.botRole = botRole;
    if (language && allowedLanguages.includes(language)) chat.language = language;

    await chat.save();

    return res.json({ success: true, chat });
  } catch (error) {
    console.error('Update Chat Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to update chat' });
    }
  }
});

// ============================================
// DELETE /api/chat/:chatId - Delete a chat
// ============================================
router.delete('/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!isValidObjectId(chatId)) {
      return res.status(400).json({ success: false, message: 'Invalid chat id' });
    }

    const chat = await Chat.findOneAndDelete({
      _id: chatId,
      user: req.user.id
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    return res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete Chat Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to delete chat' });
    }
  }
});

// ============================================
// Helper: Update Analytics
// ============================================
async function updateAnalytics(userId, chat, query, tokens, responseTime) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ user: userId, date: today });
    if (!analytics) {
      analytics = await Analytics.create({ user: userId, date: today });
    }

    analytics.totalMessages += 2;
    analytics.totalTokens += tokens;

    const langIndex = analytics.languagesUsed.findIndex(l => l.language === chat.language);
    if (langIndex >= 0) analytics.languagesUsed[langIndex].count++;
    else analytics.languagesUsed.push({ language: chat.language, count: 1 });

    const roleIndex = analytics.botRolesUsed.findIndex(r => r.role === chat.botRole);
    if (roleIndex >= 0) analytics.botRolesUsed[roleIndex].count++;
    else analytics.botRolesUsed.push({ role: chat.botRole, count: 1 });

    const queryIndex = analytics.topQueries.findIndex(q => q.query === query);
    if (queryIndex >= 0) analytics.topQueries[queryIndex].count++;
    else analytics.topQueries.push({ query, count: 1 });

    analytics.topQueries.sort((a, b) => b.count - a.count);
    analytics.topQueries = analytics.topQueries.slice(0, 10);

    analytics.avgResponseTime =
      (analytics.avgResponseTime * (analytics.totalMessages - 2) + responseTime) /
      analytics.totalMessages;

    await analytics.save();
  } catch (error) {
    console.error('Analytics Update Error:', error);
  }
}

module.exports = router;
