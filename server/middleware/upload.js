const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/AppError');

const ALLOWED = new Set(['.pdf', '.docx', '.txt']);

// Memory storage: the file is parsed and thrown away. Nothing is written to disk or the database.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new AppError('Upload a PDF, DOCX or TXT file.', 400));
    cb(null, true);
  },
});

module.exports = upload;
