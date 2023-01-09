const service = require("./service");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const { sqquery } = require("../../utils/query");
exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    await Patient.increment("remainBill", {
      by: req.body.amount,
      where: { id: req.body.patientId },
    });

    await Patient.update(
      {
        lastVisitedDate: Date.now(),
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
exports.ongoingProcessTeeth = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        clinicId: req.query.clinicId,
        patientId: req.query.patientId,
        status: "OnGoing",
      },
    });

    res.status(200).send({
      status: "success",
      data: {
        toothNumber: data[0]["toothNumber"],
      },
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
exports.getBill = async (req, res, next) => {
  try {
    const { clinicId, patientId } = req.query;
    const data = await service.get({
      attributes: [
        [sequelize.fn("sum", sequelize.col("amount")), "totalAmount"],
      ],
      where: {
        clinicId,
        patientId,
      },
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
      message: "delete Post successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
