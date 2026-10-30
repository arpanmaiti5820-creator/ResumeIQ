const Resume = require('../models/Resume');
const { AppError, asyncHandler } = require('../utils/AppError');
const { extractText, hashText } = require('../services/parser.service');
const { analyzeResume } = require('../services/ai.service');

exports.getCurrent = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id });
  res.json({ resume: resume ? resume.toPublic() : null });
});

/**
 * One CV per user.
 *  - Same CV content as the saved one  -> return the saved result, no AI call, no write.
 *  - Different CV                      -> analyze, then overwrite the saved document.
 */
exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Choose a CV file to upload.', 400);

  const text = await extractText(req.file);
  const textHash = hashText(text);

  const existing = await Resume.findOne({ user: req.user._id });
  if (existing && existing.textHash === textHash) {
    return res.json({
      resume: existing.toPublic(),
      reused: true,
      message: 'This is the same CV you already analyzed, so we loaded your saved results.',
    });
  }

  const { analysis, provider, model } = await analyzeResume(text);

  const resume = await Resume.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        fileName: req.file.originalname.slice(0, 200),
        fileSize: req.file.size,
        textHash,
        analysis,
        aiProvider: provider,
        aiModel: model,
        analyzedAt: new Date(),
        companyPreps: [],
      },
      $inc: { version: 1 },
    },
    { upsert: true, new: true }
  );

  res.status(existing ? 200 : 201).json({
    resume: resume.toPublic(),
    reused: false,
    replaced: Boolean(existing),
    message: existing ? 'New CV analyzed. It replaced your previous one.' : 'Your CV is analyzed.',
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await Resume.deleteOne({ user: req.user._id });
  res.json({ message: 'Your saved CV and its results were deleted.' });
});
