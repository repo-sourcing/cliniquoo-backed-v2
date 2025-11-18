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
const createError = require("http-errors");
const { createVisitorWithSlot } = require("../../utils/commonFunction");
const Clinic = require("../clinic/model");

exports.create = async (req, res, next) => {
  try {
    const { clinicId, patientId } = req.body;

    // if (!req.body.processedToothNumber)
    //   return next(createError(200, "tooth number must be required"));

    // const selectTooth = req.body.processedToothNumber.split(",");

    // let final = [];
    // await Promise.all(
    //   selectTooth.map(async (el) => {
    //     const runningTreatment = await Treatment.findAll({
    //       where: {
    //         status: "OnGoing",
    //         patientId: req.body.patientId,
    //         toothNumber: {
    //           [Op.like]: `%${el}%`,
    //         },
    //       },
    //     });
    //     runningTreatment.map((el) => {
    //       const tempString = el.toothNumber.toString().replaceAll(" ", "");
    //       const matchTooth = selectTooth.filter((element) =>
    //         tempString.includes(element)
    //       );

    //       if (matchTooth.length > 0) {
    //         final.push({
    //           treatment: el.name,
    //           tooth: matchTooth,
    //         });
    //       }
    //     });
    //   })
    // );

    // const ids = final.map((o) => o.treatment);
    // const filtered = final.filter(
    //   ({ treatment }, index) => !ids.includes(treatment, index + 1)
    // );

    // req.body.processedToothNumber = filtered;

    //add 10 minutes in current time

    req.body.messageTime = moment().utc().add(10, "minutes");
    req.body.messageStatus = 0;
    const data = await service.create(req.body);

    let subscriptionData = req.requestor.subscription;

    //create visitor slot
    await createVisitorWithSlot({
      clinicId,
      patientId,
      planType: subscriptionData.planType,
    });

    // // Use the calculated amount from the saved transaction
    // await Patient.decrement("remainBill", {
    //   by: data.amount,
    //   where: { id: req.body.patientId },
    // });
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

      //remove feature appointment
      await visitorService.remove({
        where: {
          clinicId,
          patientId,
          date: {
            [Op.gt]: new Date(moment().utcOffset("+05:30")),
          },
        },
      });
    }
    if (req.body?.date) {
      await visitorService.remove({
        where: {
          clinicId,
          patientId,
          date: {
            [Op.gt]: new Date(moment().utcOffset("+05:30")),
          },
        },
      });
      await Visitor.findOrCreate({
        where: {
          date: req.body.date,
          clinicId: req.body.clinicId,
          patientId: req.body.patientId,
        },
        defaults: { isVisited: true },
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
      include: [
        {
          model: Patient,
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

//doubt here
exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { clinicId, patientId, cash, online, notes, createdAt } = req.body;

    // Get the current transaction to check the previous createdAt
    const currentTransaction = await service.get({
      where: {
        id,
        clinicId,
        patientId,
      },
    });

    if (!currentTransaction || currentTransaction.length === 0) {
      return next(createError(404, "Transaction not found"));
    }

    const previousCreatedAt = currentTransaction[0].createdAt;

    // Calculate the amount directly to ensure it's updated
    const amount = (cash || 0) + (online || 0);

    const data = await service.update(
      {
        notes,
        cash,
        online,
        amount, // Explicitly set the calculated amount
        createdAt,
        messageTime: moment().utc().add(10, "minutes"),
        messageStatus: 0,
      },
      {
        where: {
          id,
          clinicId,
          patientId,
        },
      }
    );

    // // Create visitor entry for the new createdAt date
    // await visitorService.findOrCreate({
    //   where: {
    //     date: moment(createdAt).utcOffset("+05:30"),
    //     clinicId,
    //     patientId,
    //   },
    //   defaults: { isVisited: true },
    // });

    // Check if createdAt has changed
    if (
      previousCreatedAt &&
      moment(previousCreatedAt).format("YYYY-MM-DD") !==
        moment(createdAt).format("YYYY-MM-DD")
    ) {
      // Check if there are any other transactions on the previous date
      const otherTransactionsOnPreviousDate = await service.get({
        where: {
          clinicId,
          patientId,
          createdAt: {
            [Op.between]: [
              moment(previousCreatedAt).startOf("day").toDate(),
              moment(previousCreatedAt).endOf("day").toDate(),
            ],
          },
          id: {
            [Op.ne]: id, // Exclude the current transaction
          },
        },
      });

      // If no other transactions exist on the previous date, delete the visitor entry
      if (otherTransactionsOnPreviousDate.length === 0) {
        await visitorService.remove({
          where: {
            date: moment(previousCreatedAt).utcOffset("+05:30"),
            clinicId,
            patientId,
          },
        });
      }

      // Now, create or update the visitor entry for the new createdAt date
      const [newVisitorEntry, created] = await visitorService.findOrCreate({
        where: {
          date: moment(createdAt).format("YYYY-MM-DD"),
          clinicId,
          patientId,
        },
        defaults: { isVisited: true, isSchedule: true },
      });

      const clinicData = await Clinic.findOne({
        where: {
          id: clinicId,
        },
      });
      if (clinicData.timeRanges && clinicData.timeRanges.length > 0) {
        //get clinic time slot
        //find last time slot of clinic
        const clinicTimeSlot =
          clinicData.timeRanges[clinicData.timeRanges.length - 1]; //assuming last time range

        //in if end-1 need to restructure because my end is like this 22:00
        if (created) {
          const endTime = moment(clinicTimeSlot.end, "HH:mm");
          const startTime = moment(endTime).subtract(30, "minutes");

          // Update the timeSlot for the new visitor entry
          await visitorService.update(
            {
              timeSlot: [startTime.format("HH:mm"), endTime.format("HH:mm")],
            },
            {
              where: {
                id: newVisitorEntry.id,
              },
            }
          );
        }
      }

      //if createdAt is less than today then update messageStatus to 1
      //just check the date part

      if (
        moment(createdAt)
          .utcOffset("+05:30")
          .isBefore(moment().utcOffset("+05:30"), "day")
      ) {
        await service.update(
          {
            messageStatus: 1,
          },
          {
            where: {
              id,
            },
          }
        );
      } else {
        await service.update(
          {
            messageStatus: 0,
          },
          {
            where: {
              id,
            },
          }
        );
      }
    }

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
        clinicId: req.body.clinicId,
        patientId: req.body.patientId,
      },
    });

    res.status(200).send({
      status: "success",
      message: "delete Transaction successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
