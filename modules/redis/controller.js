const redisClient = require("../../utils/redis");
exports.flushAll = async (req, res, next) => {
  try {
    redisClient.flushAll();
    res.status(200).json({
      status: "success",
      message: "Clean Cache successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
