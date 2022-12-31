const service = require("./service");
const { pushNotificationTopic } = require("../../utils/notification");

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);

    res.status(201).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.sendToTopic = async (req, res, next) => {
  try {
    await pushNotificationTopic(
      "all-users",
      req.body.title,
      req.body.body,
      "PLAY_CLICK"
    );

    res.status(200).json({
      status: "success",
      message: "push notification successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
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
      status: "success",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await service.update(id, req.body);

    res.status(200).send({
      status: 200,
      message: "update notification successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
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
    next(error || createError(404, "Data not found"));
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
    next(error || createError(404, "Data not found"));
  }
};
