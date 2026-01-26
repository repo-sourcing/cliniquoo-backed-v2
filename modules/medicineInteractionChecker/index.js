const express = require('express');
const controller = require('./controller');

const router = express.Router();

router.get('/check', controller.checkInteraction);
router.post('/check-multiple', controller.checkMultipleInteractions);
router.get('/warnings', controller.getWarnings);
router.get('/high-risk', controller.getHighRiskInteractions);
router.post('/', controller.createInteraction);
router.patch('/:interactionId', controller.updateInteraction);
router.delete('/:interactionId', controller.deactivateInteraction);

module.exports = router;
