const { AppError } = require('./AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) throw new AppError('Enter a valid email address.', 400);
  return email;
}

function cleanName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2) throw new AppError('Enter your full name (at least 2 characters).', 400);
  if (name.length > 80) throw new AppError('Name is too long (80 characters max).', 400);
  return name;
}

function cleanPassword(value) {
  const password = String(value || '');
  if (password.length < 8) throw new AppError('Password must be at least 8 characters.', 400);
  if (password.length > 128) throw new AppError('Password is too long (128 characters max).', 400);
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AppError('Password must include at least one letter and one number.', 400);
  }
  return password;
}

module.exports = { cleanEmail, cleanName, cleanPassword };
