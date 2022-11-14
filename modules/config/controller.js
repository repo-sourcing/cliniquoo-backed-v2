const service = require("./service");
exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    res.status(200).json({
      status: "success",
      message: "Add Config successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        id: 1,
      },
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
    const id = 1;
    const data = await service.update(req.body, {
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "edit app config successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
