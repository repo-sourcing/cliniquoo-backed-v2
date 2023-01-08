const service = require("./service");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const clinic = require("../clinic/model");
const { sqquery, usersqquery } = require("../../utils/query");
const Treatment = require("../treatment/model");
const moment = require("moment");
const Visitor = require("../visitor/model");
exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);
    await Patient.decrement("remainBill", {
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

    if (req?.body?.isComplete === true) {
      await Treatment.update(
        {
          status: "Done",
        },
        {
          where: {
            id: req.body.patientId,
          },
        }
      );
    } else {
      await Visitor.findOrCreate({
        where: {
          date: req.body.date,
          clinicId: req.body.clinicId,
          patientId: req.body.patientId,
        },
      });
    }
    res.status(201).json({
      status: "success",
      message: "Add Transaction successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
//if we need to show all the transaction of perticular user
exports.getAllByUser = async (req, res, next) => {
  try {
    const [clinicData] = await clinic.findAll({
      where: {
        userId: req.requestor.id,
      },
    });
    const data = await service.get({
      where: { clinicId: clinicData.id },
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
exports.getByDate = async (req, res, next) => {
  try {
    const data = await service.get();

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
      status: 200,
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

    res.status(200).send({
      status: "success",
      message: "delete Post successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
