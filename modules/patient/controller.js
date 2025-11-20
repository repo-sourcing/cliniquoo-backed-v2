const service = require("./service");
const visitorService = require("../visitor/service");
const crypto = require("crypto");
const moment = require("moment");
const Treatment = require("../treatment/model");
const MedicalHistory = require("../medicalHistory/model");
const treatmentService = require("../treatment/service");
const Transaction = require("../transaction/model");
const transactionService = require("../transaction/service");
const redisClient = require("../../utils/redis");
const { Op, where } = require("sequelize");
const Visitor = require("../visitor/model");
const { sqquery, usersqquery } = require("../../utils/query");
const sequelize = require("../../config/db");
const createError = require("http-errors");
const Prescription = require("../prescription/model");
const TreatmentPlan = require("../treatmentPlan/model");
const treatmentPlanService = require("../treatmentPlan/service");
const ClinicService = require("../clinic/service");
const PatientBill = require("../patientBill/model");
const { commonData } = require("../user/constant");

exports.create = async (req, res, next) => {
  try {
    // Find patient with same phone number
    // If patient found with this  phone number. Then throw error
    // otherwise add new data
    // const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
    // var encrypted = cipher.update(req.body.mobile.toString(), "utf8", "hex");
    // encrypted += cipher.final("hex");

    // const [patientWithSamePhoneNo] = await service.get({
    //   where: { mobile: encrypted.toString() },
    // });
    // patient with same phone number is  found.
    // if (patientWithSamePhoneNo) {
    //   return res.status(400).json({
    //     message: "This Phone Number is already register,try with another one",
    //   });
    // }

    req.body.userId = req.requestor.id;

    //
    let subscriptionData = req.requestor.subscription;
    //check patient limit with patient count

    if (!subscriptionData) {
      return next(
        createError(200, "Something went wrong please try again later")
      );
    }
    if (
      subscriptionData &&
      subscriptionData.planType === commonData.supscriptionPlanData.FREE
    ) {
      if (subscriptionData.patientCount >= subscriptionData.patientLimit) {
        return next(
          createError(
            200,
            `You Can Add max ${subscriptionData.patientLimit} patient in free plan please upgrade your plan to add more patient`
          )
        );
      }
    }
    const data = await service.create(req.body);

    //find clinic data that clinic have a timeslot addded or not
    const [dataClinic] = await ClinicService.get({
      where: {
        id: req.body.clinicId,
      },
    });

    if (
      !dataClinic.timeRanges ||
      dataClinic.timeRanges.length === 0
      //||
      // subscriptionData.planType == commonData.supscriptionPlanData.BASIC
    ) {
      //if clinic have a timeslot added then check the time slot is provided or not
      await visitorService.create({
        date: moment().utcOffset("+05:30"),
        clinicId: req.body.clinicId,
        patientId: data.id,
      });
    }

    await treatmentPlanService.create({
      name: "Treatment List",
      patientId: data.id,
      clinicId: req.body.clinicId,
    });

    let patientData = await redisClient.GET(
      `patient?userId=${req.requestor.id}`
    );
    patientData = patientData ? JSON.parse(patientData) : [];
    const storeData = [
      ...patientData,
      { id: data.id, name: data.name, mobile: data.mobile },
    ];
    await redisClient.SET(
      `patient?userId=${req.requestor.id}`,
      JSON.stringify(storeData)
    );

    res.status(200).json({
      status: "success",
      message: "Patient added successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getAllByUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: { userId: req.requestor.id },
      ...usersqquery(req.query),
    });

    res.status(200).send({
      status: "success",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(
      Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten
    );
  }, []);
}

exports.getOne = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const userId = req.requestor.id;

    // Run all database queries in parallel
    const [
      patientData,
      receivedPayment,
      totalPayment,
      nextSchedule,
      totalDiscount,
    ] = await Promise.all([
      // Get patient data with related models
      service.get({
        where: { userId, id: patientId },
        include: [
          {
            model: TreatmentPlan,
            required: false,
            //order: [["createdAt", "ASC"]],
            order: [["createdAt", "ASC"]],
            include: [
              {
                model: Treatment,
                required: false,
              },
            ],
          },
          {
            model: Transaction,
            required: false,
            include: [
              {
                model: Prescription, //  include prescription inside transaction
                required: false,
                attributes: ["id", "createdAt"],
              },
            ],
          },
          {
            model: MedicalHistory,
            required: false,
          },
        ],
        order: [
          // [Treatment, "createdAt", "DESC"],
          [TreatmentPlan, "createdAt", "ASC"],
          [TreatmentPlan, Treatment, "createdAt", "ASC"],
          [Transaction, "createdAt", "ASC"],
          [MedicalHistory, "createdAt", "DESC"],
        ],
      }),
      // Get received payments
      transactionService.sum("amount", {
        where: { patientId },
      }),
      // Get total payment
      treatmentService.sum("amount", {
        where: {
          "$treatmentPlan.patientId$": patientId,
        },
        include: [
          {
            model: TreatmentPlan,
            attributes: [],
          },
        ],
      }),
      // Get next schedule
      visitorService.get({
        where: {
          patientId,
          date: {
            [Op.gt]: new Date(moment().utcOffset("+05:30")),
          },
        },
      }),

      // Get received payments
      treatmentPlanService.sum("discount", {
        where: { patientId },
      }),
    ]);

    const data = patientData[0]; // Extract the first item from patient data array

    // Handle possible null values
    const safeReceivedPayment = receivedPayment || 0;
    const safeTotalPayment = totalPayment || 0;
    // const discountAmount = data?.discountAmount || 0;
    const discountAmount = totalDiscount;
    //totalDiscount=
    const finalPayment = safeTotalPayment - totalDiscount;
    let pendingPayment = Number(finalPayment) - Number(safeReceivedPayment);
    if (pendingPayment < 0) {
      pendingPayment = 0;
    }

    res.status(200).send({
      status: "success",
      data,
      receivedPayment: safeReceivedPayment,
      discountAmount,
      totalPayment: safeTotalPayment,
      pendingPayment,
      finalPayment,
      nextSchedule: nextSchedule[0],
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
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getSearch = async (req, res, next) => {
  try {
    // let patientData = await redisClient.GET(
    //   `patient?userId=${req.requestor.id}`
    // );

    // if (patientData) {
    //   patientData = JSON.parse(patientData);
    //  } else {
    patientData = await service.get({
      where: {
        userId: req.requestor.id,
      },
    });
    // await redisClient.SET(
    //   `patient?userId=${req.requestor.id}`,
    //   JSON.stringify(patientData)
    // );
    //}
    const search = req.params.name.toLowerCase(); // normalize search term

    let searchData = patientData.filter(data => {
      return (
        (data.name && data.name.toLowerCase().includes(search)) ||
        (data.mobile && data.mobile.toString().toLowerCase().includes(search))
      );
    });
    searchData.sort((a, b) => {
      const nameA = a.name?.toLowerCase() || "";
      const nameB = b.name?.toLowerCase() || "";
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      // fallback sort by mobile
      const mobileA = a.mobile?.toString() || "";
      const mobileB = b.mobile?.toString() || "";
      return mobileA.localeCompare(mobileB);
    });

    res.status(200).send({
      status: "success",
      data: searchData,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
const getUpdatedSchedule = async (patientData, search, selectedIds) => {
  let finalSearchData = [];
  await patientData.filter(data => {
    if (data.name.includes(search) || data.mobile.includes(search)) {
      if (selectedIds.includes(data.id)) {
        data.schedule = true;
        finalSearchData = [...finalSearchData, { ...data }];
      } else {
        data.schedule = false;
        finalSearchData = [...finalSearchData, { ...data }];
      }
    }
  });
  return finalSearchData;
};

exports.getSearchByDate = async (req, res, next) => {
  try {
    let selectedIds, searchData, patientData;
    const data = await visitorService.get({
      where: {
        date: req.query.date,
        clinicId: req.query.clinicId,
      },
    });
    selectedIds = data.map(searchIds => searchIds.patientId);

    patientData = await redisClient.GET(`patient?userId=${req.requestor.id}`);
    if (patientData) {
      patientData = JSON.parse(patientData);
      searchData = await getUpdatedSchedule(
        patientData,
        req.params.name,
        selectedIds
      );
    } else {
      patientData = await service.get({
        where: {
          userId: req.requestor.id,
        },
      });
      searchData = await getUpdatedSchedule(
        patientData,
        req.params.name,
        selectedIds
      );
      await redisClient.SET(
        `patient?userId=${req.requestor.id}`,
        JSON.stringify(patientData)
      );
    }

    res.status(200).send({
      status: "success",
      data: searchData,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await service.update(req.body, {
      where: {
        id,
        userId: req.requestor.id,
      },
    });
    redisClient.DEL(`patient?userId=${req.requestor.id}`);

    let message = "edit patient successfully";

    if (req.body.isActive === false) {
      message = "patient deactivated successfully";
    }
    res.status(200).send({
      status: "success",
      message,
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;

    const data = await service.count({
      where: {
        id,
        userId: req.requestor.id,
      },
    });
    if (!data) {
      return res.status(404).send({
        status: "error",
        message: "Patient not found or you don't have permission to delete",
      });
    }
    let deletedData = await this.deletePatientAndPatientRelation(
      req.requestor.id,
      id
    );

    res.status(200).send({
      status: "success",
      message: "delete patient successfully",
      data: deletedData.data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getPatientsWithPendingAmount = async (req, res, next) => {
  try {
    const userId = req.requestor.id;

    const patients = await service.get({
      where: { userId, isActive: true },

      attributes: {
        include: [
          // Total Treatment Amount (via TreatmentPlan -> Treatment)
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(t.amount), 0)
              FROM treatmentPlans tp
              JOIN treatments t ON t.treatmentPlanId = tp.id
              WHERE tp.patientId = patient.id
              AND tp.deletedAt IS NULL
              AND t.deletedAt IS NULL
            )`),
            "totalTreatmentAmount",
          ],

          // Total Transaction Amount
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(amount), 0)
              FROM transactions trx
              WHERE trx.patientId = patient.id
              AND trx.deletedAt IS NULL
            )`),
            "totalTransactionAmount",
          ],

          // Total Discount
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(tp.discount), 0)
              FROM treatmentPlans tp
              WHERE tp.patientId = patient.id
              AND tp.deletedAt IS NULL
            )`),
            "totalDiscountAmount",
          ],

          // Pending Amount
          [
            sequelize.literal(`(
              (
                (SELECT COALESCE(SUM(t.amount), 0)
                 FROM treatmentPlans tp
                 JOIN treatments t ON t.treatmentPlanId = tp.id
                 WHERE tp.patientId = patient.id
                 AND tp.deletedAt IS NULL
                 AND t.deletedAt IS NULL)
              -
                (SELECT COALESCE(SUM(amount), 0)
                 FROM transactions trx
                 WHERE trx.patientId = patient.id
                 AND trx.deletedAt IS NULL)
              -
                (SELECT COALESCE(SUM(tp.discount), 0)
                 FROM treatmentPlans tp
                 WHERE tp.patientId = patient.id
                 AND tp.deletedAt IS NULL)
              )
            )`),
            "pendingAmount",
          ],
        ],
      },

      // only patients with pending amount > 0
      having: sequelize.literal(`(
        (
          (SELECT COALESCE(SUM(t.amount), 0)
           FROM treatmentPlans tp
           JOIN treatments t ON t.treatmentPlanId = tp.id
           WHERE tp.patientId = patient.id
           AND tp.deletedAt IS NULL
           AND t.deletedAt IS NULL)
        -
          (SELECT COALESCE(SUM(amount), 0)
           FROM transactions trx
           WHERE trx.patientId = patient.id
           AND trx.deletedAt IS NULL)
        -
          (SELECT COALESCE(SUM(tp.discount), 0)
           FROM treatmentPlans tp
           WHERE tp.patientId = patient.id
           AND tp.deletedAt IS NULL)
        ) > 0
      )`),

      ...usersqquery(req.query),
    });

    res.status(200).send({
      status: "success",
      data: patients,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.deletePatientAndPatientRelation = async (userId, patientId) => {
  try {
    const treatments = await Treatment.findAll({
      include: [
        {
          model: TreatmentPlan,
          where: { patientId },
          attributes: [], // we only need the treatment IDs
        },
      ],
      attributes: ["id"],
    });

    // Step 2: Extract treatment IDs
    const treatmentIds = treatments.map(t => t.id);
    // Run independent deletes in parallel
    await Promise.all([
      treatmentService.remove({ where: { id: treatmentIds } }),
      transactionService.remove({ where: { patientId } }),

      MedicalHistory.destroy({ where: { patientId } }),
      visitorService.remove({ where: { patientId } }),
      Prescription.destroy({ where: { patientId } }),

      treatmentPlanService.remove({ where: { patientId } }),
      PatientBill.destroy({ where: { patientId } }),
    ]);

    let data = await service.remove({ where: { id: patientId } });
    // Clear cache (independent, can also run in parallel if you want)
    await redisClient.DEL(`patient?userId=${userId}`);

    return { success: true, data };
  } catch (error) {
    throw error;
  }
};
