const service = require("./service");
const userModel = require("../user/model");
exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    res.status(201).json({
      status: "success",
      message: "Add Patient successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const data = await service.get();

    res.status(200).send({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};
exports.getByDate = async (req, res, next) => {
  try {
    const data = await service.get();

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
    const data = await service.update(id, req.body);

    res.status(203).send({
      status: 203,
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
        userId: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "delete Post successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
