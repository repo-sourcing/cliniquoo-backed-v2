const service = require("./service");

const { usersqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    req.body.userId = req.requestor.id;
    const data = await service.create(req.body);

    res.status(201).json({
      status: "success",
      message: "Add PatientBill successfully",
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
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt"],
      },
    });

    res.status(200).send({
      status: "success",
      message: "get All PatientBill successfully",
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
        userId: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "get PatientBill successfully",
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
      status: 200,
      message: "edit PatientBill successfully",
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
        userId: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "Delete PatientBill successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
