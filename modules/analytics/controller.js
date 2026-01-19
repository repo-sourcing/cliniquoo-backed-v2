const User = require("../user/model");
const Patient = require("../patient/model");
const Visitor = require("../visitor/model");
const Transaction = require("../transaction/model");
const Clinic = require("../clinic/model");
const sequelize = require("../../config/db");
const UserTransaction = require("../userTransaction/model");
const Sequelize = require("sequelize");
const moment = require("moment");
const Treatment = require("../treatment/model");
const TreatmentPlan = require("../treatmentPlan/model");
const { Op } = require("sequelize");

exports.getAll = async (req, res, next) => {
  try {
    const doctor = await User.count();
    const patient = await Patient.count();
    const visitor = await Visitor.count();
    const transactionOfPatients = await Transaction.count({
      group: [sequelize.fn("month", sequelize.col("createdAt"))],
    });
    const clinic = await Clinic.count();
    const monthlyIncomeOfApp = await UserTransaction.findAll({
      where: {
        status: "captured",
      },
      group: [sequelize.fn("month", sequelize.col("createdAt"))],
      attributes: [
        [sequelize.fn("sum", sequelize.col("amount")), "sum"],
        [sequelize.fn("month", sequelize.col("createdAt")), "month"],
      ],
      raw: true,
      order: Sequelize.literal("sum DESC"),
    });
    const doctorDaily = await User.count({
      group: [sequelize.fn("date", sequelize.col("createdAt"))],
    });
    const doctorMonthly = await User.count({
      group: [sequelize.fn("month", sequelize.col("createdAt"))],
    });
    res.status(200).send({
      status: "success",
      data: {
        doctor,
        patient,
        visitor,
        clinic,
        transactionOfPatients,
        doctorDaily,
        doctorMonthly,
        monthlyIncomeOfApp,
      },
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.requestor.id;
    let { startDate, endDate } = req.query;

    // Default to current month if dates are not provided
    if (!startDate || !endDate) {
      startDate = moment().startOf("month").format("YYYY-MM-DD HH:mm:ss");
      endDate = moment().endOf("month").format("YYYY-MM-DD HH:mm:ss");
    } else {
      // Ensure provided dates include full time range for the day
      startDate = moment(startDate)
        .startOf("day")
        .format("YYYY-MM-DD HH:mm:ss");
      endDate = moment(endDate).endOf("day").format("YYYY-MM-DD HH:mm:ss");
    }

    // 1. Get all clinics for the user
    const clinics = await Clinic.findAll({
      where: { userId },
      attributes: ["id"],
      raw: true,
    });
    const clinicIds = clinics.map(c => c.id);

    // 2. Get all treatment plans for these clinics (needed for revenue calculation)
    const treatmentPlans = await TreatmentPlan.findAll({
      where: { clinicId: { [Op.in]: clinicIds } },
      attributes: ["id"],
      raw: true,
    });
    const treatmentPlanIds = treatmentPlans.map(tp => tp.id);

    const dateFilter = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };
    const visitCountFilter = {
      date: {
        [Op.between]: [startDate, endDate],
      },
    };

    console.log("startDate:", startDate, "endDate:", endDate);

    // 3. Execute queries in parallel
    const [
      allTimeRevenue,
      allTimePayment,
      allTimePatients,
      filteredRevenue,
      filteredPayment,
      filteredFilteredPatient,
      allTimeVisitor,
      filterdVisitor,
    ] = await Promise.all([
      // 1. Total Revenue (All Time)
      treatmentPlanIds.length > 0
        ? Treatment.sum("amount", {
            where: { treatmentPlanId: { [Op.in]: treatmentPlanIds } },
          })
        : 0,

      // 2. Total Payment (All Time)
      clinicIds.length > 0
        ? Transaction.sum("amount", {
            where: { clinicId: { [Op.in]: clinicIds } },
          })
        : 0,

      // 3. Total Patient (All Time)
      Patient.count({ where: { userId } }),

      // 5. Filtered Revenue
      treatmentPlanIds.length > 0
        ? Treatment.sum("amount", {
            where: {
              treatmentPlanId: { [Op.in]: treatmentPlanIds },
              ...dateFilter,
            },
          })
        : 0,

      // 6. Filtered Payment
      clinicIds.length > 0
        ? Transaction.sum("amount", {
            where: {
              clinicId: { [Op.in]: clinicIds },
              ...dateFilter,
            },
          })
        : 0,

      // 7. Filtered Patient Count
      Patient.count({
        where: {
          userId,
          ...dateFilter,
        },
      }),
      //8. total Visitor All time
      Visitor.count({
        where: {
          clinicId: { [Op.in]: clinicIds },
          isVisited: true,
        },
      }),
      //9. Filtered Visitor
      Visitor.count({
        where: {
          clinicId: { [Op.in]: clinicIds },
          isVisited: true,
          ...visitCountFilter,
        },
      }),
    ]);

    // Handle null results from sums
    const totalRevenue = allTimeRevenue || 0;
    const totalPayment = allTimePayment || 0;
    const totalPatients = allTimePatients || 0;
    const currentRevenue = filteredRevenue || 0;
    const currentPayment = filteredPayment || 0;
    const currentPatientCount = filteredFilteredPatient || 0;
    const totalVisitor = allTimeVisitor || 0;
    const filteredVisitor = filterdVisitor || 0;

    // 4. Total Pending Amount
    const totalPendingAmount = totalRevenue - totalPayment;

    res.status(200).json({
      status: "success",
      data: {
        totalRevenue,
        totalPayment,
        totalPatients,
        totalPendingAmount,
        totalVisitor,
        filteredVisitor,
        filteredRevenue: currentRevenue,
        filteredPayment: currentPayment,
        filteredPatientCount: currentPatientCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
