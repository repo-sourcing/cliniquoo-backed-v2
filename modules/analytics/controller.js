const User = require("../user/model");
const Patient = require("../patient/model");
const Visitor = require("../visitor/model");
const Transaction = require("../transaction/model");
const Clinic = require("../clinic/model");
const sequelize = require("../../config/db");
const UserTransaction = require("../userTransaction/model");
const Sequelize = require("sequelize");

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
