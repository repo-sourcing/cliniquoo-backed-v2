const express = require("express");
const router = express.Router();
const controller = require("./controller");

router.post("/templates", controller.createTemplate);
router.patch("/templates/:templateId", controller.updateTemplate);
router.delete("/templates/:templateId", controller.deleteTemplate);
router.get("/templates/by-event/:eventType", controller.getTemplatesByEventType);

router.post("/queue", controller.queueEmail);
router.post("/send-now", controller.sendEmailNow);
router.get("/pending", controller.getPendingEmails);
router.get("/failed", controller.getFailedEmails);
router.post("/retry", controller.retryFailedEmails);
router.post("/process-queue", controller.processQueue);

router.get("/stats", controller.getEmailStats);
router.get("/logs", controller.getEmailLogs);

module.exports = router;
