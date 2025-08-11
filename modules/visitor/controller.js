const service = require("./service");
const Visitor = require("./model");
const { Op, Sequelize } = require("sequelize");
const Patient = require("../patient/model");
const Transaction = require("../transaction/model");
const transactionService = require("../transaction/service");
const Treatment = require("../treatment/model");
const moment = require("moment");
const { sqquery, usersqquery } = require("../../utils/query");
const sequelize = require("../../config/db");
const { runWhatsAppAppointmentConfirmationJob } = require("./utils");

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
      return next(
        createError(200, "this patient already schedule on this date")
      );

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

    // if (moment(date) < new Date(moment().utcOffset("+05:30")))
    //   return next(
    //     createError(200, "You can not schedule patient in past date")
    //   );
    await service.remove({
      where: {
        clinicId,
        patientId,
        date: {
          [Op.gt]: new Date(moment().utcOffset("+05:30")),
        },
      },
    });
    const data = await service.findOrCreate({
      where: {
        date,
        clinicId,
        patientId,
      },
    });

    await service.update(
      {
        isSchedule: true,
      },
      {
        where: {
          patientId,
          clinicId,
        },
      }
    );
    res.status(201).json({
      status: "success",
      message: "Patient scheduled successfully",
      data,
    });

    // after scheduling, send a WhatsApp reminder
    runWhatsAppAppointmentConfirmationJob(data[0].id);
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
          model: Patient,
          attributes: {
            include: [
              // Add treatment totals as virtual attributes using subqueries
              [
                sequelize.literal(`(
                SELECT COALESCE(SUM(amount), 0) 
                FROM treatments 
                WHERE treatments.patientId = patient.id 
                AND treatments.deletedAt IS NULL
              )`),
                "totalTreatmentAmount",
              ],
              [
                sequelize.literal(`(
                SELECT COALESCE(SUM(amount), 0) 
                FROM transactions 
                WHERE transactions.patientId = patient.id 
                AND transactions.deletedAt IS NULL
              )`),
                "totalTransactionAmount",
              ],
            ],
          },
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
              where: {
                createdAt: {
                  [Op.gte]: moment(req.query.date)
                    .subtract(330, "minutes")
                    .toDate(),
                  [Op.lte]: moment(req.query.date)
                    .add(1, "day")
                    .subtract(330, "minutes")
                    .toDate(),
                },
              },
              required: false,
              order: [["createdAt", "DESC"]],
              limit: 1,
            },
            {
              model: Transaction,
              where: {
                createdAt: {
                  [Op.gte]: moment(req.query.date)
                    .subtract(330, "minutes")
                    .toDate(),
                  [Op.lte]: moment(req.query.date)
                    .add(1, "day")
                    .subtract(330, "minutes")
                    .toDate(),
                },
              },
              order: [["createdAt", "DESC"]],
              required: false,
            },
          ],
        },
      ],
    });

    // Extract unique patient IDs from the data
    const patientIds = [
      ...new Set(data.rows.map((row) => row.patient?.id).filter(Boolean)),
    ];

    // Use Promise.all to run both queries concurrently
    const [treatmentTotals, transactionTotals] = await Promise.all([
      Treatment.findAll({
        attributes: [
          "patientId",
          [
            sequelize.fn("SUM", sequelize.col("amount")),
            "totalTreatmentAmount",
          ],
        ],
        where: {
          patientId: {
            [Op.in]: patientIds,
          },
        },
        group: ["patientId"],
        raw: true,
      }),
      Transaction.findAll({
        attributes: [
          "patientId",
          [
            sequelize.fn("SUM", sequelize.col("amount")),
            "totalTransactionAmount",
          ],
        ],
        where: {
          patientId: {
            [Op.in]: patientIds,
          },
        },
        group: ["patientId"],
        raw: true,
      }),
    ]);

    // Create lookup maps for O(1) access
    const treatmentTotalMap = treatmentTotals.reduce((acc, item) => {
      acc[item.patientId] = parseFloat(item.totalTreatmentAmount) || 0;
      return acc;
    }, {});

    const transactionTotalMap = transactionTotals.reduce((acc, item) => {
      acc[item.patientId] = parseFloat(item.totalTransactionAmount) || 0;
      return acc;
    }, {});

    // Add totals to each patient object
    const enrichedData = {
      ...data,
      rows: data.rows.map((row) => {
        const rowData = row.toJSON ? row.toJSON() : row;
        if (rowData.patient) {
          rowData.patient.totalTreatmentAmount =
            treatmentTotalMap[rowData.patient.id] || 0;
          rowData.patient.totalTransactionAmount =
            transactionTotalMap[rowData.patient.id] || 0;

          // Calculate totalRemainBill
          const totalTreatmentAmount =
            rowData.patient.totalTreatmentAmount || 0;
          const totalTransactionAmount =
            rowData.patient.totalTransactionAmount || 0;
          const discountAmount = rowData.patient.discountAmount || 0;

          // Corrected formula: totalRemainBill = totalTreatmentAmount - totalTransactionAmount - discountAmount
          rowData.patient.totalRemainBill =
            totalTreatmentAmount - totalTransactionAmount - discountAmount;
        }
        return rowData;
      }),
    };

    // Existing aggregations for clinic totals
    // Use Promise.all to run all count and sum queries concurrently
    const [totalAmount, cashAmount, visited, totalVisitor] = await Promise.all([
      transactionService.sum("amount", {
        where: {
          clinicId: req.query.clinicId,
          createdAt: {
            [Op.gte]: moment(req.query.date).subtract(330, "minutes").toDate(),
            [Op.lte]: moment(req.query.date)
              .add(1, "day")
              .subtract(330, "minutes")
              .toDate(),
          },
        },
      }),
      transactionService.sum("cash", {
        where: {
          clinicId: req.query.clinicId,
          createdAt: {
            [Op.gte]: moment(req.query.date).subtract(330, "minutes").toDate(),
            [Op.lte]: moment(req.query.date)
              .add(1, "day")
              .subtract(330, "minutes")
              .toDate(),
          },
        },
      }),
      service.count({
        where: {
          date: req.query.date,
          clinicId: req.query.clinicId,
          isVisited: true,
        },
      }),
      service.count({
        where: {
          date: req.query.date,
          clinicId: req.query.clinicId,
        },
      }),
    ]);

    res.status(200).send({
      status: "success",
      totalAmount: totalAmount ? totalAmount : 0,
      cashAmount: cashAmount ? cashAmount : 0,
      visited: visited ? visited : 0,
      totalVisitor: totalVisitor ? totalVisitor : 0,
      pendingVisitor: totalVisitor - visited,
      data: enrichedData,
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
        isSchedule: false,
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
      group: ["patientId"],
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
exports.reschedule = async (req, res, next) => {
  try {
    const { date, clinicId, patientId, previousScheduleDate } = req.body;

    const [visitor] = await service.get({
      where: {
        date,
        clinicId,
        patientId,
      },
    });

    if (visitor)
      return next(
        createError(200, "this patient already schedule on this date")
      );

    const data = await service.update(
      {
        date,
      },
      {
        where: {
          patientId,
          clinicId,
          date: previousScheduleDate,
        },
      }
    );

    // after scheduling, send a WhatsApp reminder
    runWhatsAppAppointmentConfirmationJob(visitor.id);

    res.status(200).json({
      status: "success",
      message: "Patient Rescheduled successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
