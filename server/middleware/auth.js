const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../utils/AppError');

function readToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Returns the user id from a valid token, or null. No DB hit (used for page redirects). */
function tokenUserId(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret).id;
  } catch {
    return null;
  }
}

const protect = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw new AppError('Please log in to continue.', 401);
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError('Your session has expired. Please log in again.', 401);
  }
  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('Account not found. Please log in again.', 401);
  req.user = user;
  next();
});

module.exports = { protect, tokenUserId };
