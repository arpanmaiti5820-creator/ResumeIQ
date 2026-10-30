const router = require('express').Router();
const ctrl = require('../controllers/resume.controller');
const { protect } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');
const upload = require('../middleware/upload');

router.use(protect);
router.get('/', ctrl.getCurrent);
router.post('/upload', uploadLimiter, upload.single('resume'), ctrl.upload);
router.delete('/', ctrl.remove);

module.exports = router;
