const service = require("./service");
const sequelize = require("../../config/db");
const Procedure = require("../procedure/model");
const Patient = require("../patient/model");
exports.create = async (req, res, next) => {
  try {
    const singleTreatment = [
      "bridge",
      "cast partial denture",
      "complete denture",
      "removable partial denture",
    ];
    console.log(singleTreatment.includes(req.body.name.toLowerCase()));
    if (singleTreatment.includes(req.body.name.toLowerCase())) {
      await service.create(req.body);
    } else {
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
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const limit = req.query.limit * 1 || 100;
    const page = req.query.page * 1 || 1;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "createdAt";
    const sortBy = req.query.sortBy || "DESC";

    delete req.query.limit;
    delete req.query.page;
    delete req.query.sort;
    delete req.query.sortBy;
    const data = await service.get({
      where: req.query,
      include: [
        {
          model: Procedure,
        },
      ],
      order: [[sort, sortBy]],
      limit,
      offset: skip,
    });
    res.status(200).send({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
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
    next(error);
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
    next(error);
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
    next(error);
  }
};
