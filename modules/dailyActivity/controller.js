const service = require("./service");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
const { sqquery, usersqquery } = require("../../utils/query");

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
    next(error || createError(404, "Data not found"));
  }
};

exports.getAllByUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        userId: req.requestor.id,
      },
      ...usersqquery(req.query),
    });

    res.status(200).send({
      status: "success",
      message: "get All daily activities of user successfully",
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
      message: "get All daily activities of user successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
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
      message: "edit  daily activity successfully",
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
      },
    });

    res.status(200).send({
      status: "success",
      message: "Delete Daily Activity successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
