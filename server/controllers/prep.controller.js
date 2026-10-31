const crypto = require('crypto');
const Resume = require('../models/Resume');
const { AppError, asyncHandler } = require('../utils/AppError');
const { buildCompanyPrep } = require('../services/prep.service');

const MAX_SAVED = 5; // keeps the database small: most recent companies only

// eslint-disable-next-line no-control-regex
const stripControl = (s) => String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const oneLine = (s, max) => stripControl(s).replace(/\s+/g, ' ').trim().slice(0, max);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

const summary = (p) => ({
  id: p.id,
  company: p.company,
  role: p.role,
  grounded: p.grounded,
  reportedCount: p.reports ? p.reports.used : null,
  matchScore: p.data && p.data.match ? p.data.match.score : null,
  createdAt: p.createdAt,
});

exports.list = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id });
  res.json({ preps: resume ? resume.companyPreps.map(summary) : [] });
});

exports.get = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id });
  const prep = resume && resume.companyPreps.find((p) => p.id === req.params.id);
  if (!prep) throw new AppError('That practice set was not found.', 404);
  res.json({ prep });
});

exports.create = asyncHandler(async (req, res) => {
  const company = oneLine(req.body.company, 80);
  const role = oneLine(req.body.role, 80);
  const jobDescription = stripControl(req.body.jobDescription).trim().slice(0, 6000);
  if (company.length < 2) throw new AppError('Enter the company you are preparing for.', 400);

  const resume = await Resume.findOne({ user: req.user._id });
  if (!resume) throw new AppError('Upload your CV first. The questions are built from your skills and projects.', 400);

  const key = sha(`${company.toLowerCase()}|${role.toLowerCase()}|${sha(jobDescription)}`);
  const existing = resume.companyPreps.find((p) => p.key === key);
  if (existing && !req.body.refresh) {
    return res.json({ prep: existing, reused: true });
  }

  const result = await buildCompanyPrep({ company, role, jobDescription, analysis: resume.analysis });

  const entry = {
    id: crypto.randomUUID(),
    key,
    company,
    role,
    hasJobDescription: Boolean(jobDescription),
    grounded: result.grounded,
    sources: result.sources,
    reports: result.reports, // { searched, found, used }: what the candidate-report search did
    aiModel: result.model,
    createdAt: new Date(),
    data: result.data,
  };
  resume.companyPreps = [entry, ...resume.companyPreps.filter((p) => p.key !== key)].slice(0, MAX_SAVED);
  resume.markModified('companyPreps');
  await resume.save();

  res.status(201).json({ prep: entry, reused: false });
});

exports.remove = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ user: req.user._id });
  if (resume) {
    resume.companyPreps = resume.companyPreps.filter((p) => p.id !== req.params.id);
    resume.markModified('companyPreps');
    await resume.save();
  }
  res.json({ message: 'Practice set deleted.' });
});
