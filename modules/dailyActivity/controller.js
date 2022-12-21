const service = require("./service");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
const { sqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    const data = await service.create({
      userId: req.requestor.id,
    });

    res.status(201).json({
      status: "success",
      message: "Add subscription successfully",
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
    delete req.query.limit;
    delete req.query.page;
    delete req.query.sort;
    delete req.query.sortBy;
    req.query.userId = req.params.userId;
    const data = await service.get({
      where: req.query,
      order: [[sort, sortBy]],
      limit,
      offset: skip,
    });

    res.status(200).send({
      status: "success",
      message: "get All daily activities of user successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
exports.getOne = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "get one subscription data",
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
      message: "edit  daily activity successfully",
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
      message: "Delete Daily Activity successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
