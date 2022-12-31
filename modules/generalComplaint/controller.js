const service = require("./service");
const sequelize = require("../../config/db");
const { sqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    req.body.icon = req.file ? req.file.location : null;
    const data = await service.create(req.body);
    res.status(201).json({
      status: "success",
      message: "Add general complain successfully",
      data,
    });
  } catch (error) {
    console.log("error", error);
    next(error || createError(404, "Data not found"));
  }
};

exports.edit = async (req, res, next) => {
  try {
    req.body.icon = req.file ? req.file.location : null;
    const id = req.params.id;
    const data = await service.update(req.body, {
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit general complain successfully",
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
      message: "delete general complain successfully",
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
      message: "Get general complain successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
