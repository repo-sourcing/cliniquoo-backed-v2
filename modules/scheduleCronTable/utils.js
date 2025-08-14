"use strict";
const moment = require("moment");
const service = require("./service");
const {
  runWhatsAppAppointmentConfirmationJob,
  runWhatsAppAppointmentReschedule,
} = require("../visitor/utils");
const { Op } = require("sequelize");

exports.manageScheduleAndReschedule = async () => {
  try {
    //fetch current entries  entries from schedule cron

    const findEntries = await service.get({
      where: {
        time: {
          [Op.or]: [
            {
              [Op.between]: [
                moment().utc().subtract(30, "seconds"),
                moment().utc().add(30, "seconds"),
              ],
            },
            {
              [Op.lt]: moment().utc(), // Any missed in the past
            },
          ],
        },
      },
      order: [["time", "DESC"]],
      limit: 20,
    });

    for (const entry of findEntries) {
      if (entry.status === "scheduled") {
        runWhatsAppAppointmentConfirmationJob(entry.visitorId);
      } else if (entry.status === "rescheduled") {
        runWhatsAppAppointmentReschedule(entry.visitorId);
      }

      // Delete entry after processing
      await service.remove({ where: { id: entry.id } });
    }
  } catch (err) {
    console.error(
      "[CRON] Appointment manageScheduleAndReschedule cron job failed:",
      err?.stack || err
    );
    return 0;
  }
};
