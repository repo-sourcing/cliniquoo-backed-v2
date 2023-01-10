const service = require("./service");
const userModel = require("../user/model");
let crypto = require("crypto");
const { sqquery, usersqquery } = require("../../utils/query");
exports.create = async (req, res, next) => {
  try {
    // Find clinic with e phone number
    // If clinic found with this  phone number. Then throw error
    // otherwise add new data
    const cipher = crypto.createCipher("aes128", process.env.CYPHERKEY);
    let encrypted = cipher.update(req.body.mobile.toString(), "utf8", "hex");
    encrypted += cipher.final("hex");

    const [clinicWithSamePhoneNo] = await service.get({
      where: { mobile: encrypted.toString() },
    });
    // clinic with same phone number is  found.
    if (clinicWithSamePhoneNo) {
      return res.status(400).json({
        message: "This Phone Number is already register,try with another one",
      });
    }
    const [clinic] = await service.get({
      where: {
        mobile: req.body.mobile,
      },
    });

    if (clinic)
      return res.status(200).json({
        status: "fail",
        message: "user already exist",
      });
    req.body.userId = req.requestor.id;
    const data = await service.create(req.body);

    res.status(201).json({
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
