const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');
// Import the inner file: the package root runs a debug routine in some setups.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const { AppError } = require('../utils/AppError');

const MAX_CHARS = 14000; // keeps AI cost predictable

async function extractText(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  let text = '';
  try {
    if (ext === '.pdf') {
      text = (await pdfParse(file.buffer)).text;
    } else if (ext === '.docx') {
      text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    } else {
      text = file.buffer.toString('utf8');
    }
  } catch (err) {
    console.error('[parser]', err.message);
    throw new AppError('We could not read that file. Make sure it is not password-protected or corrupted.', 422);
  }

  text = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 150) {
    throw new AppError('We found almost no text in that file. Scanned or image-only CVs are not supported. Export a text-based PDF or DOCX.', 422);
  }
  return text.slice(0, MAX_CHARS);
}

/** Hash of the normalised text, so the same CV saved as PDF or DOCX still matches. */
function hashText(text) {
  const normal = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normal).digest('hex');
}

module.exports = { extractText, hashText };
