"use strict";

const cron = require("node-cron");
const {
  runWhatsAppAppointmentReminderJob,
} = require("../modules/visitor/utils");
const {
  manageScheduleAndReschedule,
} = require("../modules/scheduleCronTable/utils");

// Schedule daily at 08:00 IST
cron.schedule("30 2 * * *", () => {
  runWhatsAppAppointmentReminderJob();
});

// schedule and reschedule cron job

cron.schedule("* * * * *", () => {
  manageScheduleAndReschedule();
});
