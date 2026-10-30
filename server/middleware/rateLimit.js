const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Limits AI usage per logged-in user (protects your API credits)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user.id : 'anonymous'),
  message: { message: 'Upload limit reached (12 per hour). Please try again later.' },
});

// Company prep also calls the AI (and web search), so it gets its own per-user limit
const prepLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user ? req.user.id : 'anonymous'),
  message: { message: 'Company practice limit reached (10 per hour). Please try again later.' },
});

module.exports = { authLimiter, uploadLimiter, prepLimiter };
