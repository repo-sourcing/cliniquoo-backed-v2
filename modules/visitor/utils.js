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
} = require("../../utils/msg91");

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
        { model: Clinic, include: [User], required: true },
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

      //   console.log({
      //     to: [toNumber],
      //     bodyValues: [
      //       clinicName,
      //       patientName,
      //       prettyDate,
      //       doctorName,
      //       clinicMobile,
      //     ],
      //   });
      sendWhatsAppAppointmentReminder({
        to: [toNumber],
        bodyValues: [
          clinicName,
          patientName,
          prettyDate,
          doctorName,
          clinicMobile,
        ],
      });
    }
  } catch (err) {
    console.error("[CRON] Appointment reminder job failed:", err?.stack || err);
    return 0;
  }
};
exports.runWhatsAppAppointmentConfirmationJob = async (visitorId) => {
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

    // console.log({
    //   to: [toNumber],
    //   bodyValues: [
    //     clinicName,
    //     patientName,
    //     prettyDate,
    //     doctorName,
    //     clinicMobile,
    //   ],
    // });
    sendWhatsAppAppointmentConfirmation({
      to: [toNumber],
      bodyValues: [
        clinicName,
        patientName,
        prettyDate,
        doctorName,
        clinicMobile,
      ],
    });
  } catch (err) {
    console.error("[CRON] Appointment reminder job failed:", err?.stack || err);
    return 0;
  }
};
