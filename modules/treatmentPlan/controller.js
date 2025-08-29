const service = require("./service");
const patientService = require("../patient/service");
const clinicService = require("../clinic/service");

const { usersqquery } = require("../../utils/query");

exports.create = async (req, res, next) => {
  try {
    req.body.userId = req.requestor.id;

    //find the clinic id from requestor is present or not
    const findPatient = await patientService.count({
      where: { id: req.body.patientId, userId: req.requestor.id },
    });
    if (!findPatient) return next(createError(404, "Patient not found"));

    //find valid clinic
    const findClinic = await clinicService.count({
      where: { id: req.body.clinicId, userId: req.requestor.id },
    });
    if (!findClinic) return next(createError(404, "Clinic not found"));
    const data = await service.create(req.body);

    res.status(201).json({
      status: "success",
      message: "Add Treatment List successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.edit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [data] = await service.get({
      where: {
        id: req.params.id,
      },
      attributes: ["clinicId"],
    });

    if (!data) return next(createError(404, "Data not found"));

    //findout user is valid or not
    const findClinic = await clinicService.count({
      where: {
        id: data.clinicId,
        userId: req.requestor.id,
      },
    });
    if (!findClinic) return next(createError(404, "Clinic not found"));

    //otherwise update the data
    const updateData = await service.update(req.body, {
      where: {
        id,
      },
    });

    res.status(200).send({
      status: 200,
      message: "edit template successfully",
      data: updateData,
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
      message: "get All template successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const id = req.params.id;

    const data = await service.get({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "get template successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [data] = await service.get({
      where: {
        id: req.params.id,
      },
      attributes: ["clinicId"],
    });

    if (!data) return next(createError(404, "Data not found"));

    //findout user is valid or not
    const findClinic = await clinicService.count({
      where: {
        id: data.clinicId,
        userId: req.requestor.id,
      },
    });
    if (!findClinic) return next(createError(404, "Clinic not found"));

    const deletedData = await service.remove({
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "Delete treatmentList successfully",
      data: deletedData,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
