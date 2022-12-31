const service = require("./service");
const Visitor = require("./model");
const { Op, Sequelize } = require("sequelize");
const Patient = require("../patient/model");
const Transaction = require("../transaction/model");
const Treatment = require("../treatment/model");
const Procedure = require("../procedure/model");
const moment = require("moment");
const { sqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    const { date, clinicId, patientId, isCanceled } = req.body;
    let previousScheduleData;
    //logic for reschedule if reschedule previous appointment date isCancelled true and add new entry
    if (req.body.previousScheduleDate) {
      previousScheduleData = await service.update(
        { isCanceled: true },
        {
          where: {
            date: req.body.previousScheduleDate,
            clinicId,
            patientId,
          },
        }
      );
    }

    const data = await Visitor.findOrCreate({
      where: {
        date,
        clinicId,
        patientId,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Add Visitor successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getAll = async (req, res, next) => {
  try {
    let no_of_visitor = 0;
    let wheres;

    if (req.query.day == "Today") {
      wheres = {
        createdAt: { [Op.gt]: moment.utc().startOf("day") },
      };
    } else if (req.query.day == "Yesterday") {
      wheres = {
        createdAt: {
          [Op.gt]: moment.utc().subtract(1, "days").startOf("day"),
          [Op.lt]: moment.utc().subtract(1, "days").endOf("day"),
        },
      };
    } else if (req.query.day == "Older") {
      wheres = {
        createdAt: {
          [Op.lt]: moment.utc().subtract(2, "days").endOf("day"),
        },
      };
    }

    if (req.query.clinicId) {
      no_of_visitor = await Visitor.count({
        where: {
          clinicId: req.query.clinicId,
        },
      });
    }
    const datafilter = { ...sqquery(req.query), ...wheres };
    const data = await service.get({
      ...datafilter,

      include: [
        {
          model: Patient,
          include: [
            {
              model: Treatment,
              where: wheres,
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
              include: [
                {
                  model: Procedure,
                  where: wheres,
                  required: false,
                  order: [["createdAt", "DESC"]],
                  limit: 1,
                },
              ],
            },
            {
              model: Transaction,
              where: wheres,
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
            },
          ],
        },
      ],
    });

    res.status(200).send({
      status: "success",
      no_of_visitor,
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getAllVisitorByDate = async (req, res, next) => {
  try {
    let no_of_visitor = 0;

    if (req.query.clinicId) {
      no_of_visitor = await Visitor.count({
        where: {
          clinicId: req.query.clinicId,
          date: req.query.date,
        },
      });
    }
    const data = await service.get({
      ...sqquery(req.query),

      include: [
        {
          model: Patient,
          include: [
            {
              model: Treatment,
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
              include: [
                {
                  model: Procedure,
                  required: false,
                  order: [["createdAt", "DESC"]],
                  limit: 1,
                },
              ],
            },
            {
              model: Transaction,
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
            },
          ],
        },
      ],
    });

    res.status(200).send({
      status: "success",
      no_of_visitor,
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.countOfvisitorForAllDates = async (req, res, next) => {
  try {
    const data = await Visitor.findAll({
      ...sqquery(req.query),

      attributes: [
        "date",
        [Sequelize.fn("count", Sequelize.col("date")), "count"],
      ],
      group: ["date"],
      raw: true,
      order: Sequelize.literal("count DESC"),
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
      status: 200,
      message: "edit visitor successfully",
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
      message: "delete visitor successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
