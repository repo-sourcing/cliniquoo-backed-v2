const moment = require("moment");
const userSubscriptionService = require("../modules/userSubscription/model");
const SubscriptionModel = require("../modules/subscription/model");
const redisClient = require("../utils/redis");

exports.checkSubscription = async (req, res, next) => {
  try {
    const userId = req.requestor.id;
    let subscriptionData = {};

    let checkSubscriptionData = await redisClient.GET(
      `checkSubscription?userId=${userId}`
    );

    let checkSubscription = JSON.parse(checkSubscriptionData);

    if (checkSubscription?.endSubscriptionDate) {
      if (moment(checkSubscription?.endSubscriptionDate).isAfter(new Date())) {
        next();
      } else {
        res.status(400).json({
          status: "fail",
          message: `To Use this Features Please Take the Subscription`,
        });
      }
    } else {
      const [data] = await userSubscriptionService.findAll({
        where: {
          userId,
        },
        include: [
          {
            model: SubscriptionModel,
            attributes: ["day"],
          },
        ],
      });
      if (data) {
        var dateOne = moment(data.date);
        var endDate = dateOne.add(data?.subscription?.dataValues?.day, "days");
        if (moment(endDate).isAfter(new Date())) {
          subscriptionData.endSubscriptionDate = endDate;
          await redisClient.SET(
            `checkSubscription?userId=${userId}`,
            JSON.stringify(subscriptionData)
          );
          next();
        } else {
          res.status(400).json({
            status: "fail",
            message: `To Use this Features Please Take the Subscription`,
          });
        }
      } else {
        res.status(400).json({
          status: "fail",
          message: `To Use this Features Please Take the Subscription`,
        });
      }
    }
  } catch (error) {
    res.status(401).json({
      status: "fail",
      message: "User not subscribed",
    });
  }
};
