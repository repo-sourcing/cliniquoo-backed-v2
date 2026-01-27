const express = require('express');
const controller = require('./controller');

const router = express.Router();

router.get('/check', controller.checkFeatureAccess);
router.get('/available', controller.getAvailableFeatures);
router.get('/by-category', controller.getFeaturesByCategory);
router.post('/enable', controller.enableFeature);
router.post('/disable', controller.disableFeature);
router.post('/bulk-enable', controller.bulkEnableFeatures);
router.post('/bulk-disable', controller.bulkDisableFeatures);
router.get('/stats', controller.getFeatureStats);
router.post('/', controller.createFeature);
router.patch('/:featureId', controller.updateFeature);

module.exports = router;
