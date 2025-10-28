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
