"use strict";
const moment = require("moment");
const { Op } = require("sequelize");
const visitor = require("./service");
const Clinic = require("../clinic/model");
const Patient = require("../patient/model");
const User = require("../user/model");
const {
  sendWhatsAppAppointmentReminder,
  sendWhatsAppAppointmentConfirmation,
  sendWhatsAppAppointmentRescheduleConfirmation,
} = require("../../utils/msg91");
const UserSubscription = require("../userSubscription/model");
const visitorService = require("./service");

exports.runWhatsAppAppointmentReminderJob = async () => {
  try {
    const todayIST = moment().utcOffset("+05:30");
    const todayStr = todayIST.format("YYYY-MM-DD"); // match Visitor.date (DATEONLY)
    const prettyDate = todayIST.format("DD-MMM-YYYY");

    const visitors = await visitor.get({
      where: {
        date: todayStr,
        isCanceled: false,
      },
      include: [
        {
          model: Clinic,
          include: [
            {
              model: User,
              required: true,
              include: [
                {
                  model: UserSubscription,
                  where: { status: "active", subscriptionId: { [Op.ne]: 6 } }, //for exclude basic plan user
                },
              ],
            },
          ],
          required: true,
        },
        { model: Patient, required: true },
      ],
    });

    if (!visitors || visitors.length === 0) {
      console.log(`[CRON] No appointments for ${todayStr} (IST)`);
      return;
    }

    // Build recipients payloads

    let skipped = 0;

    for (const v of visitors) {
      const clinic = v.clinic;
      const patient = v.patient;
      const doctor = clinic && clinic.user;

      const clinicName = clinic?.name;
      const patientName = patient?.name;
      const doctorName = doctor?.name;
      const clinicMobile = clinic?.mobile;

      let prettyTime = "Any Time";
      const timeSlot = v?.timeSlot;
      if (timeSlot && Array.isArray(timeSlot) && timeSlot.length === 2) {
        const startTime = moment(timeSlot[0], "HH:mm").format("h:mm A");
        const endTime = moment(timeSlot[1], "HH:mm").format("h:mm A");
        prettyTime = `${startTime} to ${endTime}`;
      }

      const toNumber = `91${patient?.mobile}`;

      if (
        !toNumber ||
        !clinicName ||
        !patientName ||
        !doctorName ||
        !clinicMobile
      ) {
        skipped++;
        continue;
      }

      console.log({
        to: [toNumber],
        bodyValues: [
          patientName,
          prettyDate,
          prettyTime,
          doctorName,
          clinicMobile,
          clinicName,
        ],
      });
      sendWhatsAppAppointmentReminder({
        to: [toNumber],
        bodyValues: [
          patientName,
          prettyDate,
          prettyTime,
          doctorName,
          clinicMobile,
          clinicName,
        ],
      });
    }
  } catch (err) {
    console.error("[CRON] Appointment reminder job failed:", err?.stack || err);
    return 0;
  }
};
exports.runWhatsAppAppointmentConfirmationJob = async visitorId => {
  try {
    const [visitors] = await visitor.get({
      where: {
        id: visitorId,
      },
      include: [
        { model: Clinic, include: [User], required: true },
        { model: Patient, required: true },
      ],
    });

    if (!visitors || visitors.length === 0) {
      console.log(`[CRON] No appointments for ${todayStr} (IST)`);
      return;
    }

    const prettyDate = moment(visitors?.date).format("DD-MMM-YYYY");
    let prettyTime = "Any Time";
    const timeSlot = visitors?.timeSlot;
    if (timeSlot && Array.isArray(timeSlot) && timeSlot.length === 2) {
      const startTime = moment(timeSlot[0], "HH:mm").format("h:mm A");
      const endTime = moment(timeSlot[1], "HH:mm").format("h:mm A");
      prettyTime = `${startTime} to ${endTime}`;
    }
    // Build recipients payloads

    const clinic = visitors?.clinic;
    const patient = visitors?.patient;
    const doctor = clinic && clinic.user;

    const clinicName = clinic?.name;
    const patientName = patient?.name;
    const doctorName = doctor?.name;
    const clinicMobile = clinic?.mobile;

    const toNumber = `91${patient?.mobile}`;

    if (
      !toNumber ||
      !clinicName ||
      !patientName ||
      !doctorName ||
      !clinicMobile
    ) {
      return 0;
    }

    console.log({
      to: [toNumber],
      bodyValues: [
        patientName,
        prettyDate,
        prettyTime,
        doctorName,
        clinicMobile,
        clinicName,
      ],
    });
    try {
      sendWhatsAppAppointmentConfirmation({
        to: [toNumber],
        bodyValues: [
          patientName,
          prettyDate,
          prettyTime,
          doctorName,
          clinicMobile,
          clinicName,
        ],
      });
    } catch (error) {
      console.error(
        "[CRON] Appointment reminder job failed:",
        err?.stack || err
      );
    }
  } catch (err) {
    console.error("[CRON] Appointment reminder job failed:", err?.stack || err);
    return 0;
  }
};

exports.runWhatsAppAppointmentReschedule = async visitorId => {
  try {
    const [visitors] = await visitor.get({
      where: {
        id: visitorId,
      },
      include: [
        { model: Clinic, include: [User], required: true },
        { model: Patient, required: true },
      ],
    });

    if (!visitors || visitors.length === 0) {
      console.log(`[CRON] No appointments for ${todayStr} (IST)`);
      return;
    }

    let prettyDate = moment(visitors?.date).format("DD-MMM-YYYY");
    const timeSlot = visitors?.timeSlot;
    if (timeSlot && Array.isArray(timeSlot) && timeSlot.length === 2) {
      const startTime = moment(timeSlot[0], "HH:mm").format("h:mm A");
      const endTime = moment(timeSlot[1], "HH:mm").format("h:mm A");
      prettyDate = `(${moment(visitors?.date).format(
        "DD-MM-YYYY"
      )}, ${startTime} to ${endTime})`;
    }
    // Build recipients payloads

    const clinic = visitors?.clinic;
    const patient = visitors?.patient;
    const doctor = clinic && clinic.user;

    const clinicName = clinic?.name;
    const patientName = patient?.name;
    const doctorName = doctor?.name;
    const clinicMobile = clinic?.mobile;

    const toNumber = `91${patient?.mobile}`;

    if (
      !toNumber ||
      !clinicName ||
      !patientName ||
      !doctorName ||
      !clinicMobile
    ) {
      return 0;
    }

    console.log({
      to: [toNumber],
      bodyValues: [patientName, prettyDate, clinicMobile, clinicName],
    });

    sendWhatsAppAppointmentRescheduleConfirmation({
      to: [toNumber],
      bodyValues: [patientName, prettyDate, clinicMobile, clinicName],
    });
  } catch (err) {
    console.error("[CRON] Appointment rescheduled failed:", err?.stack || err);
    return 0;
  }
};

exports.transferSlotToHourTo30Minutes = async () => {
  try {
    // 1️⃣ Get all visitors where timeSlot exists and is not null
    const allVisitors = await visitorService.get({
      where: {
        timeSlot: {
          [Op.ne]: null,
        },
      },
    });

    console.log(`🔍 Found ${allVisitors.length} visitors with timeSlot`);

    for (const visitor of allVisitors) {
      const timeSlot = visitor.timeSlot;

      // Ensure it's a valid array like ["10:00", "11:00"]
      if (!Array.isArray(timeSlot) || timeSlot.length !== 2) continue;

      const [start, end] = timeSlot;
      const startTime = moment(start, "HH:mm");
      const endTime = moment(end, "HH:mm");

      if (!startTime.isValid() || !endTime.isValid()) continue;

      // 2️⃣ Calculate duration
      const duration = endTime.diff(startTime, "minutes");

      // 3️⃣ Only process if it's a 1-hour (60 min) slot
      if (duration === 60) {
        const newEnd = moment(endTime).subtract(30, "minutes");
        const newTimeSlot = [startTime.format("HH:mm"), newEnd.format("HH:mm")];

        // Ensure start < end (otherwise skip)
        if (
          moment(newTimeSlot[0], "HH:mm").isSameOrAfter(
            moment(newTimeSlot[1], "HH:mm")
          )
        ) {
          console.warn(
            `⚠️ Skipping invalid slot for visitor ${visitor.id}:`,
            newTimeSlot
          );
          continue;
        }

        console.log(
          `⏰ Updating visitor ${visitor.id} from [${timeSlot}] → [${newTimeSlot}]`
        );

        // 4️⃣ Update DB
        await visitorService.update(
          { timeSlot: newTimeSlot },
          { where: { id: visitor.id } }
        );
      }
    }

    console.log("✅ Conversion completed successfully!");
  } catch (error) {
    console.error("Error in transferring 1 hour slot to 30 minutes", error);
  }
};
