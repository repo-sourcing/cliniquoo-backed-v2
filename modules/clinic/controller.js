const service = require("./service");
const userModel = require("../user/model");
// let crypto = require("crypto");
const { sqquery, usersqquery } = require("../../utils/query");
exports.create = async (req, res, next) => {
  try {
    req.body.userId = req.requestor.id;

    const noOfClinic = await service.count({
      where: {
        userId: req.requestor.id,
      },
    });

    if (noOfClinic >= 3)
      return next(createError(200, "You Can Add max 3 clinic"));

    // Convert mobile to string before saving
    req.body.mobile = req.body.mobile.toString();

    const data = await service.create(req.body);

    res.status(200).json({
      status: "success",
      message: "Add Clinic successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getAllByUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: { userId: req.requestor.id },
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
          model: userModel,
          attributes: ["name", "profilePic", "mobile", "about", "email"],
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

exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await service.update(req.body, {
      where: {
        id,
        userId: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit clinic successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const noOfClinic = await service.count({
      where: {
        userId: req.requestor.id,
      },
    });

    if (noOfClinic <= 1)
      return next(createError(200, "Minimum 1 clinic is required"));

    const data = await service.remove({
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "delete Clinic successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
