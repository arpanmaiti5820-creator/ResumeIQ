const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../utils/AppError');
const { cleanEmail, cleanName, cleanPassword } = require('../utils/validate');
const { sendResetEmail } = require('../services/mail.service');

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

function startSession(res, user) {
  const token = jwt.sign({ id: user._id.toString() }, config.jwtSecret, { expiresIn: `${config.jwtDays}d` });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.jwtDays * 24 * 60 * 60 * 1000,
  });
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

exports.publicConfig = (req, res) => {
  res.json({ googleClientId: config.googleClientId || null });
};

exports.register = asyncHandler(async (req, res) => {
  const name = cleanName(req.body.name);
  const email = cleanEmail(req.body.email);
  const password = cleanPassword(req.body.password);

  const existing = await User.findOne({ email }).select('+password');
  if (existing) {
    if (existing.googleId && !existing.password) {
      throw new AppError('This email already uses Google sign-in. Continue with Google, or use "Forgot password" to add a password.', 409);
    }
    throw new AppError('An account with this email already exists. Log in instead.', 409);
  }

  const user = await User.create({ name, email, password });
  startSession(res, user);
  res.status(201).json({ user: user.toPublic() });
});

exports.login = asyncHandler(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!password) throw new AppError('Enter your password.', 400);

  const user = await User.findOne({ email }).select('+password');
  if (user && !user.password && user.googleId) {
    throw new AppError('This account uses Google sign-in. Continue with Google instead.', 401);
  }
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Email or password is incorrect.', 401);
  }
  startSession(res, user);
  res.json({ user: user.toPublic() });
});

exports.google = asyncHandler(async (req, res) => {
  if (!googleClient) throw new AppError('Google sign-in is not set up on this server (missing GOOGLE_CLIENT_ID).', 503);
  const credential = String(req.body.credential || '');
  if (!credential) throw new AppError('Google sign-in failed. Try again.', 400);

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch (err) {
    console.error('[google]', err.message);
    throw new AppError('Google sign-in could not be verified. Try again.', 401);
  }
  if (!payload || !payload.email || !payload.email_verified) {
    throw new AppError('Your Google email is not verified.', 401);
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });
  if (!user) {
    user = await User.create({ name: payload.name || email.split('@')[0], email, googleId: payload.sub, avatar: payload.picture });
  } else {
    if (!user.googleId) user.googleId = payload.sub;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
    await user.save();
  }
  startSession(res, user);
  res.json({ user: user.toPublic() });
});

exports.logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: config.isProd });
  res.json({ message: 'Logged out.' });
};

exports.me = (req, res) => {
  res.json({ user: req.user.toPublic() });
};

exports.forgotPassword = asyncHandler(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const reply = { message: 'If an account exists for that email, a reset link is on its way.' };

  const user = await User.findOne({ email });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = sha256(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const url = `${config.appUrl}/reset-password/${rawToken}`;
    try {
      const result = await sendResetEmail(user, url);
      // Convenience for local development only (never in production)
      if (!config.isProd && result.devUrl) reply.devResetUrl = result.devUrl;
    } catch (err) {
      console.error('[mail] failed to send reset email:', err.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
  }
  res.json(reply);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const password = cleanPassword(req.body.password);
  const user = await User.findOne({
    resetPasswordToken: sha256(String(req.params.token || '')),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) throw new AppError('This reset link is invalid or has expired. Request a new one.', 400);

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  startSession(res, user);
  res.json({ message: 'Password updated.', user: user.toPublic() });
});
