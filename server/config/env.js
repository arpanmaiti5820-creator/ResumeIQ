const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const config = {
  isProd,
  port: Number(env.PORT) || 5000,
  appUrl: (env.APP_URL || `http://localhost:${Number(env.PORT) || 5000}`).replace(/\/$/, ''),
  mongoUri: env.MONGO_URI,
  jwtSecret: env.JWT_SECRET,
  jwtDays: Number(env.JWT_EXPIRES_DAYS) || 7,
  googleClientId: env.GOOGLE_CLIENT_ID || '',
  ai: {
    provider: (env.AI_PROVIDER || 'anthropic').toLowerCase(),
    anthropic: {
      key: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      baseUrl: env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    },
    gemini: {
      key: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      // optional: a different model just for web search (falls back to GEMINI_MODEL when empty)
      searchModel: env.GEMINI_SEARCH_MODEL || '',
    },
    openai: {
      key: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
    },
  },
  // optional: Tavily web search (free plan, no card). Finds real interview pages without using AI quota.
  search: { tavilyKey: env.TAVILY_API_KEY || '' },
  smtp: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  mailFrom: env.MAIL_FROM || 'ResumeIQ <no-reply@resumeiq.local>',
};

config.smtpConfigured = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

config.validate = () => {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGO_URI');
  if (!config.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required .env value(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }
  if (config.jwtSecret.length < 16) {
    console.warn('[config] JWT_SECRET is short. Use a long random string.');
  }
  const p = config.ai.provider;
  if (!['anthropic', 'gemini', 'openai'].includes(p)) {
    throw new Error(`AI_PROVIDER must be anthropic, gemini or openai (got "${p}").`);
  }
  if (!config.ai[p].key) {
    console.warn(`[config] No API key for AI_PROVIDER="${p}". Resume analysis will fail until you add it to .env.`);
  }
  if (!config.googleClientId) {
    console.warn('[config] GOOGLE_CLIENT_ID not set. Google sign-in is disabled.');
  }
  if (!config.smtpConfigured) {
    console.warn('[config] SMTP not set. Password reset links will be printed in this console.');
  }
};

module.exports = config;
