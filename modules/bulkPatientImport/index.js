const express = require('express');
const multer = require('multer');
const controller = require('./controller');

const router = express.Router();

// Memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Routes
router.post('/', upload.single('file'), controller.createImport);
router.get('/:jobId', controller.getImportJob);
router.get('/', controller.getImportJobs);
router.get('/:jobId/stats', controller.getImportStats);
router.delete('/:jobId', controller.deleteImport);

module.exports = router;
