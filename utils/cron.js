"use strict";

const cron = require("node-cron");
const {
  runWhatsAppAppointmentReminderJob,
} = require("../modules/visitor/utils");
const {
  manageScheduleAndReschedule,
} = require("../modules/scheduleCronTable/utils");
const { sendPaymentConfirmtion } = require("../modules/transaction/utils");
const { subscriptionActivationCron } = require("../modules/razorpay/utils");

// // Schedule daily at 08:00 IST
cron.schedule("30 2 * * *", () => {
  runWhatsAppAppointmentReminderJob();
});

// // schedule and reschedule cron job

cron.schedule("* * * * *", () => {
  manageScheduleAndReschedule();
});

// //schedule a payment confirmation message
// // schedule and reschedule cron job

cron.schedule("* * * * *", () => {
  sendPaymentConfirmtion();
});

// 12:30 AM IST = 7:00 PM UTC (previous day)
cron.schedule("0 20 * * *", () => {
  subscriptionActivationCron();
});
