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
    next(error || createError(404, "Data not found"));
  }
};

exports.get = async (req, res, next) => {
  try {
    const data = await service.get();

    res.status(200).send({
      status: "success",
      data: data[0],
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
      message: "edit app config successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
