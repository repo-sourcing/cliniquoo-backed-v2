const service = require("./service");
const { Op } = require("sequelize");

const { sqquery, usersqquery } = require("../../utils/query");
const sequelize = require("../../config/db");
const medicineService = require("../medicine/service");
const frequencyUsedMedicineService = require("../frequentlyUsedMedicine/service");
const Transaction = require("../transaction/model");
const Patient = require("../patient/model");
const Clinic = require("../clinic/model");
const User = require("../user/model");
const moment = require("moment/moment");
const {
  generatePrescriptionPDF,
  buildSchedule,
  buildInstructions,
} = require("./utils");
const { sendWhatsAppPrescription } = require("../../utils/msg91");
const Visitor = require("../visitor/model");
const { commonData } = require("../user/constant");

exports.create = async (req, res, next) => {
  let subscriptionData = req.requestor.subscription;
  //check patient limit with patient count

  if (!subscriptionData) {
    return next(
      createError(404, "Something went wrong please try again later")
    );
  }
  if (
    subscriptionData &&
    subscriptionData.planType === commonData.supscriptionPlanData.BASIC
  ) {
    return next(createError(404, `Please upgrade a plan to use this feature`));
  }
  const t = await sequelize.transaction();
  try {
    const { prescription } = req.body;
    const userId = req.requestor.id;
    req.body.userId = userId;

    // Step 1: Fetch existing medicines in one query
    const medicineNames = prescription.map(p => p.name);
    const existingMedicines = await medicineService.get({
      where: {
        name: medicineNames,
        [Op.or]: [
          { userId: req.requestor.id }, // userId equals requestor id
          { userId: { [Op.is]: null } }, // userId is null
        ],
      },
    });

    const existingMap = {};
    existingMedicines.forEach(med => (existingMap[med.name] = med));

    // Step 2: Bulk create missing medicines
    const newMedicinesData = prescription
      .filter(p => !existingMap[p.name])
      .map(p => ({
        name: p.name,
        userId,
        qty: p.qty,
        days: p.days,
        frequency: p.frequency,
      }));

    const newMedicines = await medicineService.bulkCreate(newMedicinesData, {
      transaction: t,
      returning: true,
    });

    newMedicines.forEach(med => (existingMap[med.name] = med));

    // Step 3: Prepare frequency updates & prescription entries

    for (const item of prescription) {
      const medicineId = existingMap[item.name].id;

      const [freqUsage, created] =
        await frequencyUsedMedicineService.findOrCreate({
          where: { medicineId, userId },
          defaults: { count: 1 },
          transaction: t,
        });

      if (!created) {
        await freqUsage.increment("count", { by: 1, transaction: t });
      }
    }

    // prepare prescription data{}

    const data = await service.create(req.body, { transaction: t });

    await t.commit();

    res.status(201).json({
      status: "success",
      message: "Prescription created successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.edit = async (req, res, next) => {
  try {
    const { prescription } = req.body;
    const userId = req.requestor.id;

    const [prescriptionRecord] = await service.get({
      where: { id: req.params.id, userId },
    });

    if (!prescriptionRecord) {
      return res.status(404).json({
        status: "error",
        message: "Prescription not found",
      });
    }

    // Compare only date part (ignoring time)

    const createdDate = moment(prescriptionRecord.createdAt)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

    if (createdDate !== today) {
      return res.status(400).json({
        status: "error",
        message: "You can only update prescription created today",
      });
    }

    if (prescription && prescription.length > 0) {
      // Step 1: Fetch existing medicines in one query
      const medicineNames = prescription.map(p => p.name);
      const existingMedicines = await medicineService.get({
        where: {
          name: medicineNames,
          [Op.or]: [
            { userId: req.requestor.id }, // userId equals requestor id
            { userId: { [Op.is]: null } }, // userId is null
          ],
        },
      });

      const existingMap = {};
      existingMedicines.forEach(med => (existingMap[med.name] = med));

      // Step 2: Bulk create missing medicines
      const newMedicinesData = prescription
        .filter(p => !existingMap[p.name])
        .map(p => ({
          name: p.name,
          userId,
          qty: p.qty,
          days: p.days,
          frequency: p.frequency,
        }));

      const newMedicines = await medicineService.bulkCreate(newMedicinesData, {
        returning: true,
      });
      // Step 3: Update frequentlyUsedMedicine count only for newly created medicines
      newMedicines.forEach(med => (existingMap[med.name] = med));
      for (const med of newMedicines) {
        await frequencyUsedMedicineService.findOrCreate({
          where: { medicineId: med.id, userId },
          defaults: { count: 1 },
        });
      }
    }

    const data = await service.update(req.body, {
      where: {
        id: req.params.id,
        userId,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Prescription updated successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getOne = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        id: req.params.id,
        userId: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "get prescription data",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.sendPrescription = async (req, res, next) => {
  try {
    let subscriptionData = req.requestor.subscription;
    //check patient limit with patient count

    if (!subscriptionData) {
      return next(
        createError(404, "Something went wrong please try again later")
      );
    }
    if (
      subscriptionData &&
      subscriptionData.planType === commonData.supscriptionPlanData.BASIC
    ) {
      return next(
        createError(404, `Please upgrade a plan to use this feature`)
      );
    }
    const [data] = await service.get({
      where: {
        id: req.params.id,
        userId: req.requestor.id,
      },
      include: [
        {
          model: Transaction,
          attributes: ["id"],
          include: [
            {
              model: Patient,
              attributes: ["id", "name", "age", "gender", "mobile"],
              include: [
                {
                  model: User,
                  attributes: [
                    "id",
                    "name",
                    "degree",
                    "specialization",
                    "registrationNumber",
                    "signature",
                  ],
                },
                {
                  model: Visitor,
                  where: {
                    isVisited: true,
                  },
                  attributes: ["date", "timeSlot"],
                  limit: 1,
                  order: [["createdAt", "DESC"]],
                },
              ],
            },
            {
              model: Clinic,
              attributes: ["id", "name", "location", "mobile"],
            },
          ],
        },
      ],
    });

    const { transaction, prescription: medicinesList, notes, createdAt } = data;
    const { clinic, patient } = transaction;
    const doctor = patient.user;
    const visitor = patient.visitors[0];

    const visitorDate =
      visitor?.timeSlot?.length && visitor?.timeSlot
        ? `${visitor.date} ${visitor.timeSlot[0]} to ${visitor.timeSlot[1]}`
        : `${visitor.date}`;

    let degree =
      doctor.degree == "MDS" && doctor.specialization !== null
        ? `${doctor.degree} (${doctor.specialization})`
        : doctor.degree;

    let prescriptionData = {
      clinic_name: clinic.name,
      clinic_address: clinic.location,
      clinic_phone_number: clinic.mobile,

      dr_name: doctor.name,
      degree: degree,
      registration_no: doctor.registrationNumber,
      signature: doctor.signature || null,

      patient_name: patient.name,
      patient_age: patient.age,
      patient_gender: patient.gender,
      prescription_date: new Date(createdAt).toLocaleDateString("en-GB"), // e.g. 25/08/2025

      medicines: medicinesList.map((med, index) => ({
        no: index + 1,
        name: med.name,
        quantity: med.qty,
        duration: `${med.days} days`,
        schedule: buildSchedule(med.frequency),
        instruction: buildInstructions(med.frequency),
      })),

      notes: notes || "",
    };

    const url = await generatePrescriptionPDF(prescriptionData);
    let toNumber = `91${patient?.mobile}`;

    try {
      sendWhatsAppPrescription({
        to: [toNumber],
        header: {
          filename: "prescription.pdf",
          value: url,
        },
        bodyValues: [
          patient.name,
          doctor.name,
          visitorDate,
          prescriptionData.clinic_phone_number,
          prescriptionData.clinic_name,
        ],
      });
    } catch (error) {
      console.log("error in prescription send", error);
    }

    res.status(200).send({
      status: "success",
      message: "prescription send successfully",
      data: url,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getAllByUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        userId: req.requestor.id,
      },
      ...usersqquery(req.query),
    });

    res.status(200).send({
      status: "success",
      message: "get All daily activities of user successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getAll = async (req, res, next) => {
  try {
    const data = await service.get({
      ...sqquery(req.query),
    });

    res.status(200).send({
      status: "success",
      message: "get All daily activities of user successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;

    const data = await service.remove({
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "Delete Daily Activity successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
