const service = require("./service");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
const { sqquery } = require("../../utils/query");
const razorpayInstance = require("../../utils/razorpay");

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    res.status(201).json({
      status: "success",
      message: "Add  user transaction successfully",
      data,
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
    const data = await service.get({
      where: req.query,
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
      message: "edit user transaction successfully",
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
      },
    });

    res.status(200).send({
      status: "success",
      message: "delete user transaction successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
