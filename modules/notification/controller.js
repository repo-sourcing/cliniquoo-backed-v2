const service = require("./service");

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    res.status(201).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyNotification = async (req, res, next) => {
  try {
    const userId = req.requestor.id;
    const data = await service.get({
      where: {
        userId,
      },
    });

    res.status(200).send({
      status: 200,
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
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

exports.removeOne = async (req, res, next) => {
  try {
    const id = req.params.id;

    const data = await service.remove({
      where: {
        id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "delete Notification successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeAll = async (req, res, next) => {
  try {
    const userId = req.requestor.id;

    const data = await service.remove({
      where: {
        userId,
      },
    });

    res.status(200).send({
      status: "success",
      message: "delete All Notification successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
