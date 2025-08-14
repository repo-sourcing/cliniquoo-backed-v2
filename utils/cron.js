"use strict";

const cron = require("node-cron");
const {
  runWhatsAppAppointmentReminderJob,
} = require("../modules/visitor/utils");
const {
  manageScheduleAndReschedule,
} = require("../modules/scheduleCronTable/utils");
const { sendPaymentConfirmtion } = require("../modules/transaction/utils");

// Schedule daily at 08:00 IST
cron.schedule("30 2 * * *", () => {
  runWhatsAppAppointmentReminderJob();
});

// schedule and reschedule cron job

cron.schedule("* * * * *", () => {
  manageScheduleAndReschedule();
});

//schedule a payment confirmation message
// schedule and reschedule cron job

cron.schedule("* * * * *", () => {
  sendPaymentConfirmtion();
});
