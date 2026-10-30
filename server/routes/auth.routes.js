const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.get('/config', ctrl.publicConfig);
router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/google', authLimiter, ctrl.google);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password/:token', authLimiter, ctrl.resetPassword);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);
router.get('/config', ctrl.publicConfig);
router.post('/google', authLimiter, ctrl.google);


module.exports = router;
