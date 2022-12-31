const service = require("./service");
const sequelize = require("../../config/db");
const Procedure = require("../procedure/model");
const Patient = require("../patient/model");
const { sqquery } = require("../../utils/query");
exports.create = async (req, res, next) => {
  try {
    const singleTreatment = [
      "bridge",
      "cast partial denture",
      "complete denture",
      "removable partial denture",
    ];

    if (singleTreatment.includes(req.body.name.toLowerCase())) {
      await service.create(req.body);
    } else {
      if (req.body.toothNumber) {
        const dent = req.body.toothNumber.split(",");
        for (let i in dent) {
          await service.create({
            name: req.body.name,
            toothNumber: dent[i],
            amount: (req.body.amount / dent.length).toFixed(2),
            clinicId: req.body.clinicId,
            patientId: req.body.patientId,
          });
        }
      } else {
        await service.create(req.body);
      }
    }
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

exports.getAll = async (req, res, next) => {
  try {
    const data = await service.get({
      ...sqquery(req.query),
      include: [
        {
          model: Procedure,
        },
      ],
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
