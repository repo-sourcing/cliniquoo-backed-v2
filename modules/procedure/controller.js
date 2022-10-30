const service = require("./service");
const Patient = require("../patient/model");
const Treatment = require("../treatment/service");

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);
    const [treatment] = await Treatment.get({
      where: {
        id: req.body.treatmentId,
      },
    });
    await Patient.update(
      {
        lastVisitedDate: Date.now(),
      },
      {
        where: {
          id: treatment.patientId,
        },
      }
    );
    res.status(201).json({
      status: "success",
      message: "Add Procedure successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const data = await service.get({
      where: req.query,
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
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit procedure successfully",
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
      message: "delete procedure successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
