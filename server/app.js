const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { tokenUserId } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const clientDir = path.join(__dirname, '..', 'client');
const page = (name) => path.join(clientDir, 'pages', name);

if (config.isProd) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://accounts.google.com/gsi/client'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com'],
        'connect-src': ["'self'", 'https://accounts.google.com/gsi/'],
        'frame-src': ['https://accounts.google.com/gsi/'],
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

/* API */
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/resume', require('./routes/resume.routes'));
app.use('/api/prep', require('./routes/prep.routes'));

/* Static assets (css, js, images) */
app.use('/assets', express.static(path.join(clientDir, 'assets'), { maxAge: config.isProd ? '7d' : 0 }));

/* Pages */
app.get('/', (req, res) => res.sendFile(page('index.html')));

const guestOnly = (file) => (req, res) => {
  if (tokenUserId(req)) return res.redirect('/dashboard');
  return res.sendFile(page(file));
};
app.get('/login', guestOnly('login.html'));
app.get('/register', guestOnly('register.html'));
app.get('/forgot-password', guestOnly('forgot-password.html'));
app.get('/reset-password/:token', (req, res) => res.sendFile(page('reset-password.html')));

app.get('/dashboard', (req, res) => {
  if (!tokenUserId(req)) return res.redirect('/login');
  res.set('Cache-Control', 'no-store');
  return res.sendFile(page('dashboard.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
