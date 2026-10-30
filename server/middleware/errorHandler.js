const multer = require('multer');
const config = require('../config/env');

function notFound(req, res, next) {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ message: 'That API route does not exist.' });
  }
  return res.redirect('/');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.expose ? err.message : null;

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 5 MB.' : 'Upload failed. Try a different file.';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(' ');
  } else if (err.code === 11000) {
    status = 409;
    message = 'That value is already in use.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid request body.';
  }

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    message: message || (config.isProd ? 'Something went wrong on our side. Try again.' : err.message),
  });
}

module.exports = { notFound, errorHandler };
