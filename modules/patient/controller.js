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
    const data = await service.create(req.body);
    await visitorService.create({
      date: moment().utcOffset("+05:30"),
      clinicId: req.body.clinicId,
      patientId: data.id,
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
    const [patientData, receivedPayment, totalPayment, nextSchedule] =
      await Promise.all([
        // Get patient data with related models
        service.get({
          where: { userId, id: patientId },
          include: [
            {
              model: Treatment,
              required: false,
              order: [["createdAt", "DESC"]],
            },
            {
              model: Transaction,
              required: false,
              order: [["createdAt", "DESC"]],
            },
            {
              model: MedicalHistory,
              required: false,
              order: [["createdAt", "DESC"]],
            },
          ],
        }),
        // Get received payments
        transactionService.sum("amount", {
          where: { patientId },
        }),
        // Get total payment
        treatmentService.sum("amount", {
          where: { patientId },
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
      ]);

    const data = patientData[0]; // Extract the first item from patient data array

    // Handle possible null values
    const safeReceivedPayment = receivedPayment || 0;
    const safeTotalPayment = totalPayment || 0;
    const discountAmount = data?.discountAmount || 0;
    const finalPayment = safeTotalPayment - discountAmount;

    res.status(200).send({
      status: "success",
      data,
      receivedPayment: safeReceivedPayment,
      discountAmount,
      totalPayment: safeTotalPayment,
      pendingPayment: finalPayment - safeReceivedPayment,
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
    let patientData = await redisClient.GET(
      `patient?userId=${req.requestor.id}`
    );

    if (patientData) {
      patientData = JSON.parse(patientData);
    } else {
      patientData = await service.get({
        where: {
          userId: req.requestor.id,
        },
      });
      await redisClient.SET(
        `patient?userId=${req.requestor.id}`,
        JSON.stringify(patientData)
      );
    }
    const searchData = patientData.filter((data) => {
      return (
        data.name.includes(req.params.name) ||
        data.mobile.includes(req.params.name)
      );
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
  await patientData.filter((data) => {
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
    selectedIds = data.map((searchIds) => searchIds.patientId);

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

    res.status(200).send({
      status: "success",
      message: "edit transaction successfully",
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
        userId: req.requestor.id,
      },
    });
    await visitorService.remove({
      where: {
        patientId: id,
      },
    });
    redisClient.DEL(`patient?userId=${req.requestor.id}`);
    res.status(200).send({
      status: "success",
      message: "delete patient successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
