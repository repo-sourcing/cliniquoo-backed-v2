const service = require("./service");
const userModel = require("../user/model");
// let crypto = require("crypto");
const { sqquery, usersqquery } = require("../../utils/query");

function normalizeTimeRangesInput(input) {
  if (!input) return undefined; // don't set if absent
  const str = Array.isArray(input) ? input : String(input);
  return str; // model will normalize; validation already checks
}

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
    if (req.body.mobile != null) req.body.mobile = req.body.mobile.toString();

    // Normalize optional time fields
    if ("timeRanges" in req.body) {
      req.body.timeRanges = normalizeTimeRangesInput(req.body.timeRanges);
    }

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

    if (req.body.mobile != null) req.body.mobile = req.body.mobile.toString();
    if ("timeRanges" in req.body) {
      req.body.timeRanges = normalizeTimeRangesInput(req.body.timeRanges);
    }

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
