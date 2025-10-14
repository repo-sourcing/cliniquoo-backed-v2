const { findUserSubscription } = require("../modules/user/controller");

exports.subscriptionData = async (req, res, next) => {
  try {
    const userId = req.requestor.id;

    const findSubscription = await findUserSubscription(userId);
    req.requestor.subscription = findSubscription;
    next();
  } catch (error) {
    return next(createError(200, "User not subscribed"));
  }
};
