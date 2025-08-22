const service = require("./service");
const { Op } = require("sequelize");
const { sqquery, usersqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    req.body.userId = req.requestor.id;
    const data = await service.create(req.body);

    res.status(201).json({
      status: "success",
      message: "Add medicine successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getAllByUser = async (req, res, next) => {
  try {
    //in this condition I want to add the search on medicine name
    let name;

    if (req.query.search) {
      const search = `%${req.query.search}%`;
      name = { [Op.like]: search };
    }
    const data = await service.findAndCountAll({
      where: {
        [Op.or]: [
          { userId: req.requestor.id }, // userId equals requestor id
          { userId: { [Op.is]: null } }, // userId is null
        ],
        ...(name ? { name } : {}),
      },
      ...usersqquery(req.query),
      //exclude attributes: ["createdAt", "updatedAt"], // Exclude createdAt and updatedAt
      attributes: {
        exclude: ["createdAt", "updatedAt"],
      },
    });

    res.status(200).send({
      status: "success",
      message: "get All medicines of user successfully",
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
      message: "get All Medicine successfully",
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
      message: "get one medicine data",
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
      message: "edit medicine successfully",
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
      message: "Delete Medicine successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
