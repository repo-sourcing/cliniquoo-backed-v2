const service = require("./service");
const visitorService = require("../visitor/service");
const crypto = require("crypto");
const redisClient = require("../../utils/redis");
const { Op } = require("sequelize");
const { sqquery, usersqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    // Find patient with same phone number
    // If patient found with this  phone number. Then throw error
    // otherwise add new data
    const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
    var encrypted = cipher.update(req.body.mobile.toString(), "utf8", "hex");
    encrypted += cipher.final("hex");

    const [patientWithSamePhoneNo] = await service.get({
      where: { mobile: encrypted.toString() },
    });
    // patient with same phone number is  found.
    if (patientWithSamePhoneNo) {
      return res.status(400).json({
        message: "This Phone Number is already register,try with another one",
      });
    }

    req.body.userId = req.requestor.id;
    const data = await service.create(req.body);

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

    res.status(201).json({
      status: "success",
      message: "Add Patient successfully",
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
    patientData = JSON.parse(patientData);
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
exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await service.update(req.body, {
      where: {
        id,
        userId: req.requestor.id,
      },
    });

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
    res.status(200).send({
      status: "success",
      message: "delete patient successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
