const service = require("./service");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const visitorService = require("../visitor/service");
const moment = require("moment");
const { sqquery } = require("../../utils/query");
const treatmentPlanService = require("../treatmentPlan/service");
exports.create = async (req, res, next) => {
  try {
    const { treatmentPlanId } = req.body;
    const data = await service.create(req.body);

    const [treatmentPlan] = await treatmentPlanService.get({
      where: {
        id: treatmentPlanId,
      },
    });
    if (!treatmentPlan)
      return next(createError(404, "Treatment Plan not found"));
    const clinicId = treatmentPlan.clinicId;
    const patientId = treatmentPlan.patientId;

    await visitorService.findOrCreate({
      where: {
        date: moment().utcOffset("+05:30"),
        clinicId,
        patientId,
      },
      defaults: { isVisited: true },
    });
    await Patient.increment("remainBill", {
      by: req.body.amount,
      where: { id: patientId },
    });

    await visitorService.update(
      {
        isVisited: true,
      },
      {
        where: {
          patientId,
          clinicId,
          date: moment().utcOffset("+05:30"),
          isVisited: false,
        },
      }
    );
    await Patient.update(
      {
        lastVisitedDate: moment().utcOffset("+05:30"),
      },
      {
        where: {
          id: patientId,
        },
      }
    );

    res.status(200).json({
      status: "success",
      message: "Treatment added successfully",
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
