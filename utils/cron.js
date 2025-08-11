"use strict";

const cron = require("node-cron");
const {
  runWhatsAppAppointmentReminderJob,
} = require("../modules/visitor/utils");

// Schedule daily at 08:00 IST
cron.schedule("30 2 * * *", () => {
  runWhatsAppAppointmentReminderJob();
});
