const service = require("./service");
const sequelize = require("../../config/db");
exports.create = async (req, res, next) => {
  try {
    await service.create(req.body);
    res.status(201).json({
      status: "success",
      message: "Add Medical History of Patient successfully",
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
      status: "success",
      message: "edit medical history of patient successfully",
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
      message: "delete Medical History  successfully",
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
        patientId: req.params.patientId,
      },
    });

    res.status(200).send({
      status: "success",
      message: "Get Medical History of patient successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
