const service = require("./service");
const { Op, Sequelize } = require("sequelize");
const { sqquery, usersqquery } = require("../../utils/query");
const { commonData } = require("../user/constant");

exports.create = async (req, res, next) => {
  try {
    let [data] = await service.update(req.body, {
      where: {
        userId: req.body.userId,
      },
    });
    if (data) {
      return res.status(201).json({
        status: "success",
        message: "Add  user subscription successfully",
        data,
      });
    }
    let addData = await service.create(req.body);

    res.status(201).json({
      status: "success",
      message: "Add  user subscription successfully",
      data: addData,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getOneByUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        userId: req.requestor.id,
      },
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
    });

    res.status(200).send({
      status: "success",
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
      message: "edit user Subscription successfully",
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
      message: "delete user subscription successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.editPatientLimit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [getData] = await service.get({
      where: {
        userId: id,
        subscriptionId: 10, // Free plan subscription id
        status: commonData.SubscriptionStatus.ACTIVE,
      },
    });
    if (!getData) {
      return res.status(404).send({
        status: 404,
        message: "No active free plan subscription found for this user",
      });
    }
    const data = await service.update(req.body, {
      where: {
        userId: id,
        subscriptionId: 10, // Free plan subscription id
      },
    });

    res.status(200).send({
      status: 200,
      message: "edit patient limit successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
