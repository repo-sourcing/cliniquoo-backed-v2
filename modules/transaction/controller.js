const service = require("./service");
const { Op, Sequelize } = require("sequelize");
const sequelize = require("../../config/db");
const Patient = require("../patient/model");
const clinic = require("../clinic/model");
const { sqquery, usersqquery } = require("../../utils/query");
const Treatment = require("../treatment/model");
const moment = require("moment");
const Visitor = require("../visitor/model");
const visitorService = require("../visitor/service");

exports.create = async (req, res, next) => {
  try {
    const { clinicId, patientId } = req.body;

    if (!req.body.processedToothNumber)
      return next(createError(200, "tooth number must be required"));

    const selectTooth = req.body.processedToothNumber.split(",");
    let final = [];
    await Promise.all(
      selectTooth.map(async (el) => {
        const runningTreatment = await Treatment.findAll({
          where: {
            status: "OnGoing",
            patientId: req.body.patientId,
            toothNumber: {
              [Op.like]: `%${el}%`,
            },
          },
        });
        runningTreatment.map((el) => {
          final.push({
            treatment: el.name,
            tooth: selectTooth.filter((element) =>
              el.toothNumber.includes(element)
            ),
          });
        });
      })
    );

    const ids = final.map((o) => o.treatment);
    const filtered = final.filter(
      ({ treatment }, index) => !ids.includes(treatment, index + 1)
    );

    req.body.processedToothNumber = filtered;
    const data = await service.create(req.body);

    await visitorService.findOrCreate({
      where: {
        date: moment().utcOffset("+05:30"),
        clinicId,
        patientId,
      },
      defaults: { isVisited: true },
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

    await Patient.decrement("remainBill", {
      by: req.body.amount,
      where: { id: req.body.patientId },
    });
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

    if (req.body?.isComplete === true) {
      await Treatment.update(
        {
          status: "Done",
        },
        {
          where: {
            patientId: req.body.patientId,
          },
        }
      );
    }
    if (req.body?.date) {
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
