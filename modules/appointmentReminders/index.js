const express = require("express");
const controller = require("./controller");

const router = express.Router();

/**
 * Appointment Reminders Routes
 * Base: /api/v1/appointmentReminders
 * Auth applied at routes/v1.js level
 */

// POST /appointmentReminders/:clinicId
router.post("/:clinicId", controller.create);

// GET /appointmentReminders/:clinicId
router.get("/:clinicId", controller.getAll);

// GET /appointmentReminders/:clinicId/:reminderId
router.get("/:clinicId/:reminderId", controller.getOne);

// PATCH /appointmentReminders/:clinicId/:reminderId
router.patch("/:clinicId/:reminderId", controller.update);

// DELETE /appointmentReminders/:clinicId/:reminderId
router.delete("/:clinicId/:reminderId", controller.delete);

// POST /appointmentReminders/trigger/send-pending
router.post("/trigger/send-pending", controller.sendPendingReminders);

module.exports = router;
