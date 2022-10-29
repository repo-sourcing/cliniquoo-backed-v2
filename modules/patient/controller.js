const service = require("./service");
const Treatment = require("../treatment/model");
const visitorService = require("../visitor/service");
const Procedure = require("../procedure/model");
const Transaction = require("../transaction/model");
const { Op } = require("sequelize");
exports.create = async (req, res, next) => {
  try {
    req.body.userId = req.requestor.id;
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
    const limit = req.query.limit * 1 || 100;
    const page = req.query.page * 1 || 1;
    const skip = (page - 1) * limit;
    const sort = req.query.sort || "createdAt";
    const sortBy = req.query.sortBy || "DESC";
    delete req.query.limit;
    delete req.query.page;
    delete req.query.sort;
    delete req.query.sortBy;
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
exports.getSearch = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        name: {
          [Op.like]: `${req.params.name}%`,
        },
        userId: req.requestor.id,
      },
      include: [
        {
          model: Treatment,
          order: [["createdAt", "DESC"]],
          limit: 1,
          include: [
            {
              model: Procedure,
              order: [["createdAt", "DESC"]],
              limit: 1,
            },
          ],
        },
        {
          model: Transaction,
          order: [["createdAt", "DESC"]],
          limit: 1,
        },
      ],
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
        userId: req.requestor.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit transaction successfully",
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
    await visitorService.remove({
      where: {
        patientId: id,
      },
    });
    res.status(200).send({
      status: "success",
      message: "delete patient successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
