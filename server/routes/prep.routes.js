const router = require('express').Router();
const ctrl = require('../controllers/prep.controller');
const { protect } = require('../middleware/auth');
const { prepLimiter } = require('../middleware/rateLimit');

router.use(protect);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', prepLimiter, ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
