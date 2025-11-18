const service = require("./service");
const scheduleCronService = require("../scheduleCronTable/service");
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
const TreatmentPlan = require("../treatmentPlan/model");
const ClinicService = require("../clinic/service");
const createError = require("http-errors");
const { commonData } = require("../user/constant");

exports.create = async (req, res, next) => {
  try {
    const { date, clinicId, patientId, timeSlot } = req.body;
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
      timeSlot: timeSlot ? timeSlot : null,
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
    const { date, clinicId, patientId, timeSlot } = req.body;

    // if (moment(date) < new Date(moment().utcOffset("+05:30")))
    //   return next(
    //     createError(200, "You can not schedule patient in past date")
    //   );

    //centralize clinic: remove from all clinic future schedules for same patient

    // first find all clinicId for this user
    const clinics = await ClinicService.get({
      where: {
        userId: req.requestor.id,
      },
      attributes: ["id"],
    });

    const clinicIds = clinics.map(clinic => clinic.id);

    await service.remove({
      where: {
        // clinicId,
        clinicId: { [Op.in]: clinicIds },
        patientId,
        date: {
          [Op.gt]: new Date(moment().utcOffset("+05:30")),
        },
      },
    });

    //find clinic data that clinic have a timeslot addded or not
    // const [dataClinic] = await ClinicService.get({
    //   where: {
    //     id: clinicId,
    //   },
    // });

    // if (dataClinic.timeRanges && dataClinic.timeRanges.length > 0) {
    //   //if clinic have a timeslot added then check the time slot is provided or not
    //   if (!timeSlot)
    //     return next(
    //       createError(404, "Please provide time slot for this clinic")
    //     );
    // }

    // create if not exists; if exists and timeSlot provided, update it

    const data = await service.findOrCreate({
      where: {
        date,
        clinicId,
        patientId,
      },
      defaults: {
        timeSlot: timeSlot ?? null,
      },
    });

    if (!data[1] && typeof timeSlot !== "undefined") {
      await service.update(
        { timeSlot: timeSlot ?? null },
        { where: { id: data[0].id } }
      );
    }

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

    //remove old cron entry if exists for same visitor
    //first find the entry
    const visited = await service.count({
      where: { patientId },
    });

    let subscriptionData = req.requestor.subscription;
    if (!subscriptionData) {
      return next(
        createError(404, "Something went wrong please try again later")
      );
    }

    if (
      visited != 1 &&
      subscriptionData.planType !== commonData.supscriptionPlanData.BASIC
    ) {
      await scheduleCronService.remove({ where: { visitorId: data[0].id } });
      await scheduleCronService.create({
        visitorId: data[0].id,
        time: moment(data[0].createdAt).add(10, "minutes"),
        status: "scheduled",
      });
    }

    // after scheduling, send a WhatsApp reminder
    //runWhatsAppAppointmentConfirmationJob(data[0].id);
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
              // [
              //   sequelize.literal(`(
              //   SELECT COALESCE(SUM(amount), 0)
              //   FROM treatments
              //   WHERE treatments.patientId = patient.id
              //   AND treatments.deletedAt IS NULL
              // )`),
              //   "totalTreatmentAmount",
              // ],
              [
                sequelize.literal(`(
              SELECT COALESCE(SUM(t.amount), 0)
              FROM treatmentPlans tp
              JOIN treatments t ON t.treatmentPlanId = tp.id
              WHERE tp.patientId = patient.id
              AND tp.deletedAt IS NULL
              AND t.deletedAt IS NULL
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
      ...new Set(data.rows.map(row => row.patient?.id).filter(Boolean)),
    ];

    // Use Promise.all to run both queries concurrently
    const [treatmentTotals, transactionTotals, discountTotals] =
      await Promise.all([
        Treatment.findAll({
          attributes: [
            [sequelize.col("treatmentPlan.patientId"), "patientId"],
            [
              sequelize.fn("SUM", sequelize.col("amount")),
              "totalTreatmentAmount",
            ],
          ],
          include: [
            {
              model: TreatmentPlan,
              attributes: [],
              where: {
                patientId: {
                  [Op.in]: patientIds,
                },
              },
            },
          ],
          group: ["treatmentPlan.patientId"],
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
        TreatmentPlan.findAll({
          attributes: [
            "patientId",
            [
              sequelize.fn("SUM", sequelize.col("discount")),
              "totalDiscountAmount",
            ],
          ],
          where: {
            patientId: { [Op.in]: patientIds },
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
    const discountTotalMap = discountTotals.reduce((acc, item) => {
      acc[item.patientId] = parseFloat(item.totalDiscountAmount) || 0;
      return acc;
    }, {});

    // Add totals to each patient object
    const enrichedData = {
      ...data,
      rows: data.rows.map(row => {
        const rowData = row.toJSON ? row.toJSON() : row;
        if (rowData.patient) {
          rowData.patient.totalTreatmentAmount =
            treatmentTotalMap[rowData.patient.id] || 0;
          rowData.patient.totalTransactionAmount =
            transactionTotalMap[rowData.patient.id] || 0;
          rowData.patient.totalDiscountAmount =
            discountTotalMap[rowData.patient.id] || 0;

          // Calculate totalRemainBill
          const totalTreatmentAmount =
            rowData.patient.totalTreatmentAmount || 0;
          const totalTransactionAmount =
            rowData.patient.totalTransactionAmount || 0;
          const discountAmount = rowData.patient.totalDiscountAmount || 0;

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
          required: true,
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
    const { date, clinicId, patientId, previousScheduleDate, timeSlot } =
      req.body;

    const clinics = await ClinicService.get({
      where: {
        userId: req.requestor.id,
      },
      attributes: ["id"],
    });

    const clinicIds = clinics.map(clinic => clinic.id);

    const [visitor] = await service.get({
      where: {
        date,
        clinicId: { [Op.in]: clinicIds },
        patientId,
      },
    });

    if (visitor && !timeSlot)
      return next(
        createError(200, "this patient already schedule on this date")
      );

    const [findData] = await service.get({
      where: {
        date: previousScheduleDate,
        clinicId: { [Op.in]: clinicIds },
        patientId,
      },
    });

    if (!findData) return next(createError(404, "Data not found"));

    //find clinic data that clinic have a timeslot addded or not
    // const [dataClinic] = await ClinicService.get({
    //   where: {
    //     id: clinicId,
    //   },
    // });

    // if (dataClinic.timeRanges && dataClinic.timeRanges.length > 0) {
    //   //if clinic have a timeslot added then check the time slot is provided or not
    //   if (!timeSlot)
    //     return next(
    //       createError(404, "Please provide time slot for this clinic")
    //     );
    // }

    const now = new Date();
    // check the findData created it with current time comparition that is less than 10 minute or greater than 10 minute
    const createdAt = new Date(findData.createdAt);

    const diffMinutes = Math.floor((now - createdAt) / (1000 * 60));

    let subscriptionData = req.requestor.subscription;

    if (
      subscriptionData &&
      subscriptionData.planType !== commonData.supscriptionPlanData.BASIC
    ) {
      //findScheduleCronData
      const [findScheduleCronData] = await scheduleCronService.get({
        where: {
          visitorId: findData.id,
        },
      });

      //if notification already sent and data is schedule cron is deleted
      if (!findScheduleCronData) {
        if (diffMinutes <= 10) {
          // Within 10 minutes → create schedule only
          await scheduleCronService.create({
            visitorId: findData.id,
            time: moment().add(10, "minutes"),
            status: "scheduled",
          });
        } else {
          // If no scheduleCron exists, create a new one
          await scheduleCronService.create({
            visitorId: findData.id,
            time: moment().add(10, "minutes"),
            status: "rescheduled",
          });
        }
      } else {
        if (diffMinutes <= 10) {
          // Within 10 minutes → update schedule only

          if (findScheduleCronData) {
            let status =
              findScheduleCronData?.status == "scheduled"
                ? "scheduled"
                : "rescheduled";

            await scheduleCronService.update(
              { status: status, time: moment().add(10, "minutes") },
              { where: { visitorId: findData.id } }
            );
          }
        } else {
          // More than 10 minutes → update schedule and status to 'reschedule'
          await scheduleCronService.update(
            { status: "rescheduled", time: moment().add(10, "minutes") },
            { where: { visitorId: findData.id } }
          );
        }
      }
    }

    const data = await service.update(
      {
        date,
        timeSlot: typeof timeSlot !== "undefined" ? timeSlot : null,
        clinicId,
      },
      {
        where: {
          patientId,
          clinicId: { [Op.in]: clinicIds },
          date: previousScheduleDate,
        },
      }
    );

    res.status(200).json({
      status: "success",
      message: "Patient Rescheduled successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
