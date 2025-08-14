"use strict";
const moment = require("moment");
const service = require("./service");
const { Op } = require("sequelize");
const Clinic = require("../clinic/model");
const Patient = require("../patient/model");
const { sendWhatsAppPaymentConfirmation } = require("../../utils/msg91");

exports.sendPaymentConfirmtion = async () => {
  try {
    //fetch current entries  entries from transaction

    const findEntries = await service.get({
      where: {
        messageTime: {
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
        messageStatus: 0,
      },
      attributes: ["cash", "online", "amount", "createdAt", "id"],
      include: [
        {
          model: Clinic,
          attributes: ["name", "mobile"],
          required: true, // only these fields from clinic table
        },
        {
          model: Patient,
          attributes: ["name", "mobile"],
          required: true, // only these fields from patient table
        },
      ],

      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    if (findEntries.length) {
      for (const entry of findEntries) {
        const clinic = entry?.clinic;
        const patient = entry?.patient;
        const date = moment(entry?.createdAt).format("DD/MM/YYYY");

        const clinicName = clinic?.name;
        const patientName = patient?.name;
        const clinicMobile = clinic?.mobile;
        const amount = entry?.amount;
        const paymentMode =
          entry?.cash > 0 && entry?.online > 0
            ? "Cash and Online"
            : entry?.cash > 0
            ? "Cash"
            : entry?.online > 0
            ? "Online"
            : "None";

        const toNumber = `91${patient?.mobile}`;
        if (
          !toNumber ||
          !clinicName ||
          !patientName ||
          !clinicMobile ||
          !date ||
          !amount ||
          !paymentMode
        ) {
          return 0;
        }

        console.log({
          to: [toNumber],
          bodyValues: [
            patientName,
            date,
            amount,
            paymentMode,
            clinicName,
            clinicMobile,
          ],
        });

        sendWhatsAppPaymentConfirmation({
          to: [toNumber],
          bodyValues: [
            patientName,
            date,
            amount,
            paymentMode,
            clinicName,
            clinicMobile,
          ],
        });

        // Delete entry after processing
        await service.update({ messageStatus: 1 }, { where: { id: entry.id } });
      }
    }
  } catch (err) {
    console.error("[CRON] payment confirmation job failed:", err?.stack || err);
    return 0;
  }
};
