const service = require("./service");
const Visitor = require("./model");
const { Op, Sequelize } = require("sequelize");
const Patient = require("../patient/model");
const Transaction = require("../transaction/model");
const transactionService = require("../transaction/service");
const Treatment = require("../treatment/model");
const moment = require("moment");
const { sqquery, usersqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    const { date, clinicId, patientId } = req.body;
    // let previousScheduleData;
    // //logic for reschedule if reschedule previous appointment date isCancelled true and add new entry
    // if (req.body.previousScheduleDate) {
    //   previousScheduleData = await service.update(
    //     { isCanceled: true },
    //     {
    //       where: {
    //         date: req.body.previousScheduleDate,
    //         clinicId,
    //         patientId,
    //       },
    //     }
    //   );
    // }
    const [visitor] = await service.get({
      where: {
        date,
        clinicId,
        patientId,
      },
    });

    if (visitor)
      return res.status(200).json({
        status: "fail",
        message: "this patient already schedul on this date",
      });

    const data = await service.create({
      date,
      clinicId,
      patientId,
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

exports.schedule = async (req, res, next) => {
  try {
    const { date, clinicId, patientId } = req.body;

    const data = await service.findOrCreate({
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
exports.getOne = async (req, res, next) => {
  try {
    const data = await service.get({
      where: { clinicId: req.query.clinicId, id: req.params.id },
      include: [
        {
          model: Patient,
          include: [
            {
              model: Treatment,
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
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
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getAllVisitorByDate = async (req, res, next) => {
  try {
    const data = await service.findAndCountAll({
      where: {
        date: req.query.date,
        clinicId: req.query.clinicId,
      },
      ...usersqquery(req.query),
      include: [
        {
          model: Patient,
          include: [
            {
              model: Treatment,
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
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
    const totalAmount = await transactionService.sum("amount", {
      where: {
        clinicId: req.query.clinicId,
      },
    });
    const cashAmount = await transactionService.sum("amount", {
      where: {
        clinicId: req.query.clinicId,
        type: "Cash",
      },
    });
    const visited = await service.count({
      where: {
        date: req.query.date,
        isVisited: true,
      },
    });

    res.status(200).send({
      status: "success",
      totalAmount: totalAmount ? totalAmount : 0,
      cashAmount: cashAmount ? cashAmount : 0,
      visited: visited ? visited : 0,
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.findNotVisited = async (req, res, next) => {
  try {
    let startDate = moment().subtract(7, "days");
    let endDate = moment().subtract(1, "days");

    const data = await service.get({
      where: {
        date: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
        clinicId: req.query.clinicId,
        isVisited: false,
      },

      include: [
        {
          model: Patient,
          include: [
            {
              model: Treatment,
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
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
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.countOfvisitorForAllDates = async (req, res, next) => {
  try {
    let startDate = moment().subtract(14, "days");
    let endDate = moment().add(14, "days");
    const featurePatientCount = await Visitor.count({
      where: {
        date: {
          [Op.gte]: new Date(moment().utcOffset("+05:30")),
          [Op.lte]: moment(endDate).add(1, "days"),
        },
        clinicId: req.query.clinicId,
      },
      group: [Sequelize.fn("date", Sequelize.col("date"))],
    });
    const missPatientCount = await Visitor.count({
      where: {
        date: {
          [Op.lte]: new Date(moment().utcOffset("+05:30").subtract(1, "days")),
          [Op.gte]: moment(startDate),
        },
        isVisited: false,
        clinicId: req.query.clinicId,
      },
      group: [Sequelize.fn("date", Sequelize.col("date"))],
    });
    res.status(200).send({
      status: "success",
      featurePatientCount,
      missPatientCount,
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
