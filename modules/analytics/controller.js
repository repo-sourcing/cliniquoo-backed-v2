const User = require("../user/model");
const Patient = require("../patient/model");
const Visitor = require("../visitor/model");
const Transaction = require("../transaction/model");
const sequelize = require("../../config/db");

exports.getAll = async (req, res, next) => {
  try {
    const doctor = await User.count();
    const patient = await Patient.count();
    const visitor = await Visitor.count();
    const transaction = await Transaction.count();
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
        transaction,
        doctorDaily,
        doctorMonthly,
      },
    });
  } catch (error) {
    next(error);
  }
};
