const service = require("./service");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const visitorService = require("../visitor/service");
const moment = require("moment");
const { sqquery } = require("../../utils/query");
exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    await Patient.increment("remainBill", {
      by: req.body.amount,
      where: { id: req.body.patientId },
    });
    await visitorService.update(
      {
        isVisited: true,
      },
      {
        where: {
          patientId: req.body.patientId,
          clinicId: req.body.clinicId,
          date: moment().utcOffset("+05:30"),
        },
      }
    );
    await Patient.update(
      {
        lastVisitedDate: moment().utcOffset("+05:30"),
      },
      {
        where: {
          id: req.body.patientId,
        },
      }
    );

    res.status(201).json({
      status: "success",
      message: "Add Treatment successfully",
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

exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await service.update(req.body, {
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit treatment successfully",
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

    res.status(200).send({
      status: "success",
      message: "delete treatment successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
