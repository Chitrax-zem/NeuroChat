const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: ['user', 'assistant', 'system'],
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    fileAttachments: [
      {
        filename: String,
        mimetype: String,
        size: Number,
        path: String,
      },
    ],
    metadata: {
      model: String,
      temperature: Number,
      tokens: Number,
    },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    systemPrompt: {
      type: String,
      default: 'You are a helpful AI assistant.',
    },
    botRole: {
      type: String,
      default: 'assistant',
      enum: [
        'assistant',
        'student-helper',
        'fitness-coach',
        'coding-assistant',
        'medical-advisor',
        'financial-advisor',
        'creative-writer',
      ],
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'es', 'fr', 'de', 'zh'],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

/**
 * Pre-save hook to derive a title from the first user message
 * if title is empty or default.
 * Note: async hook WITHOUT `next` — do not mix patterns.
 */
chatSchema.pre('save', async function () {
  if (
    Array.isArray(this.messages) &&
    this.messages.length > 0 &&
    (!this.title || this.title === 'New Conversation')
  ) {
    const firstUserMessage = this.messages.find((msg) => msg && msg.role === 'user' && typeof msg.content === 'string');
    if (firstUserMessage && firstUserMessage.content) {
      const base = firstUserMessage.content.substring(0, 50).trim();
      this.title = base.length === 50 ? `${base}...` : base || 'New Conversation';
    }
  }
});

// Optional: startup marker to confirm the right model file is loaded
// console.log('[Chat model] async pre-save hook loaded');

module.exports = mongoose.model('Chat', chatSchema);
