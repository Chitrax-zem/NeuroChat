// utils/openai.js (Groq-compatible using the OpenAI client with custom baseURL)

const OpenAI = require('openai');

// IMPORTANT: for Groq, we use baseURL pointing to Groq's API and your GROQ_API_KEY
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
});

/**
  Recommended Groq models (Jan 2026 per Groq deprecations):
  - llama-3.1-8b-instant        (fast/affordable)
  - llama-3.3-70b-versatile     (higher quality)
  - mixtral-8x7b-32768          (still common)
  - gemma-7b-it                 (availability may vary)
*/
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// Any deprecated model IDs you want to guard against (based on Groq deprecation docs)
const DEPRECATED_GROQ_MODELS = new Set([
  'llama3-8b-8192',
  'llama3-70b-8192',
]);

function isDeprecatedGroqModel(name = '') {
  return DEPRECATED_GROQ_MODELS.has(String(name).trim());
}

const systemPrompts = {
  'assistant': 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.',
  'student-helper': 'You are a patient and knowledgeable tutor. Explain concepts step-by-step, use examples, and encourage learning.',
  'fitness-coach': 'You are a certified fitness coach. Provide workout advice, nutrition tips, and motivation while prioritizing safety.',
  'coding-assistant': 'You are an expert programmer. Help with code, explain concepts, debug issues, and provide best practices.',
  'medical-advisor': 'You are a helpful medical information provider. Always recommend consulting healthcare professionals for serious concerns.',
  'financial-advisor': 'You are a financial consultant. Provide general financial education and always suggest professional advice for specific decisions.',
  'creative-writer': 'You are a creative writing assistant. Help with storytelling, editing, and developing creative ideas.'
};

const languageInstructions = {
  'en': 'Respond in English.',
  'hi': 'हिंदी में उत्तर दें (Respond in Hindi).',
  'es': 'Responde en español (Respond in Spanish).',
  'fr': 'Répondez en français (Respond in French).',
  'de': 'Antworten Sie auf Deutsch (Respond in German).',
  'zh': '用中文回答（Respond in Chinese）。'
};

/**
 * Generate a chat response (streaming or non-streaming) via Groq
 * Params:
 *  - messages: [{ role: 'user'|'assistant'|'system', content: string }, ...]
 *  - options: { model, temperature, maxTokens, stream, botRole, language }
 *
 * Returns:
 *  - If stream=true: an async iterable stream compatible with your current code
 *  - If stream=false: { content, usage, model }
 */
async function generateChatResponse(messages, options = {}) {
  try {
    const {
      model: requestedModel,
      temperature = 0.7,
      maxTokens = 1000,
      stream = true,
      botRole = 'assistant',
      language = 'en'
    } = options;

    // Resolve model (prefer env default, clamp deprecated)
    let model = requestedModel || DEFAULT_MODEL;
    if (!model || isDeprecatedGroqModel(model)) {
      model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    }

    const systemPrompt = systemPrompts[botRole] || systemPrompts['assistant'];
    const languageInstruction = languageInstructions[language] || languageInstructions['en'];

    const fullMessages = [
      {
        role: 'system',
        content: `${systemPrompt} ${languageInstruction}`
      },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    if (stream) {
      // Streaming chat completion
      const streamResp = await openai.chat.completions.create({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      });

      // Groq returns a readable async iterator similar to OpenAI
      return streamResp;
    } else {
      // Non-streaming chat completion
      const resp = await openai.chat.completions.create({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      });

      const choice = resp.choices?.[0];
      return {
        content: choice?.message?.content || '',
        usage: resp.usage,
        model: resp.model
      };
    }
  } catch (error) {
    // Typical errors:
    // - 400 model_decommissioned
    // - 401 Unauthorized: bad key
    // - 404 model_not_found
    // - 429 rate limit
    // - Other 4xx/5xx
    console.error('Groq API Error:', error);

    const code = error?.status || error?.code;
    if (code === 429) {
      const err = new Error('insufficient_quota');
      err.code = 'insufficient_quota';
      throw err;
    }

    // Pass through specific model errors cleanly if you want
    if (error?.code === 'model_not_found' || error?.code === 'model_decommissioned') {
      const err = new Error(error?.message || 'Model error');
      err.code = error.code;
      throw err;
    }

    throw new Error('Failed to generate response from AI');
  }
}

/**
 * Image generation placeholder.
 * Groq does not currently provide image generation like OpenAI DALL·E via this endpoint.
 * Keep interface for compatibility; route to another provider if needed.
 */
async function generateImage(prompt) {
  try {
    throw new Error('Image generation is not supported by Groq API.');
  } catch (error) {
    console.error('Image Generation Error:', error);
    throw new Error('Failed to generate image');
  }
}

function getAvailableModels() {
  // Keep this list in sync with Groq’s docs and your account availability
  return [
    'llama-3.1-8b-instant',     // fast / low cost
    'llama-3.3-70b-versatile',  // higher quality
    'mixtral-8x7b-32768',
    'gemma-7b-it'
  ];
}

function getBotRoles() {
  return Object.keys(systemPrompts).map((key) => ({
    value: key,
    label: key.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }));
}

function getSupportedLanguages() {
  return [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'zh', name: '中文 (Chinese)' }
  ];
}

module.exports = {
  generateChatResponse,
  generateImage,
  getAvailableModels,
  getBotRoles,
  getSupportedLanguages
};
