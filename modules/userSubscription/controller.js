const service = require("./service");
const { Op, Sequelize } = require("sequelize");
const { sqquery, usersqquery } = require("../../utils/query");
const { commonData } = require("../user/constant");

const subscriptionService = require("../subscription/service");
let userSubscriptionService = require("../userSubscription/service");
const transactionService = require("../userTransaction/service");
const moment = require("moment-timezone");
const createError = require("http-errors");

exports.create = async (req, res, next) => {
  try {
    let [data] = await service.update(req.body, {
      where: {
        userId: req.body.userId,
      },
    });
    if (data) {
      return res.status(201).json({
        status: "success",
        message: "Add  user subscription successfully",
        data,
      });
    }
    let addData = await service.create(req.body);

    res.status(201).json({
      status: "success",
      message: "Add  user subscription successfully",
      data: addData,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getOneByUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        userId: req.requestor.id,
      },
      ...usersqquery(req.query),
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
      },
    });

    res.status(200).send({
      status: 200,
      message: "edit user Subscription successfully",
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
      message: "delete user subscription successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.editPatientLimit = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [getData] = await service.get({
      where: {
        userId: id,
        subscriptionId: 10, // Free plan subscription id
        status: commonData.SubscriptionStatus.ACTIVE,
      },
    });
    if (!getData) {
      return res.status(404).send({
        status: 404,
        message: "No active free plan subscription found for this user",
      });
    }
    const data = await service.update(req.body, {
      where: {
        userId: id,
        subscriptionId: 10, // Free plan subscription id
      },
    });

    res.status(200).send({
      status: 200,
      message: "edit patient limit successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.addBasicPlan = async (req, res, next) => {
  try {
    const userId = req.requestor.id;

    let subscriptionData = req.requestor.subscription;

    if (
      subscriptionData &&
      subscriptionData.planType !== commonData.supscriptionPlanData.FREE
    ) {
      return res.status(400).send({
        status: 400,
        message: "You already have an active subscription",
      });
    }

    // if (
    //   subscriptionData &&
    //   subscriptionData.planType === commonData.supscriptionPlanData.FREE
    // ) {
    //   if (subscriptionData.patientCount < subscriptionData.patientLimit) {
    //     return next(
    //       createError(
    //         400,
    //         `you already have a patient limit of ${subscriptionData.patientLimit} and you have used ${subscriptionData.patientCount} patients. So, you cannot upgrade your plan now.`,
    //       ),
    //     );
    //   }
    // }

    //find the basic plan in plan table
    const plan = await subscriptionService.get({
      where: {
        planType: commonData.supscriptionPlanData.BASIC,
      },
    });
    console.log("plan", plan);

    const transaction = await transactionService.create({
      amount: plan[0].price,
      status: "success",
      userId: userId,
      subscriptionId: plan[0].id,
    });
    const todayIST = moment
      .tz("Asia/Kolkata")
      .startOf("day")
      .format("YYYY-MM-DD");

    await userSubscriptionService.update(
      { status: commonData.SubscriptionStatus.EXPIRE, endDate: todayIST },

      {
        where: {
          userId: userId,
          status: commonData.SubscriptionStatus.ACTIVE,
        },
      },
    );
    //create entry in user subscription table with active status and expire free plan

    let addData = await userSubscriptionService.create({
      userId: userId,
      subscriptionId: plan[0].id,
      startDate: todayIST,
      //if days is 0 then not add expiry date
      //expiryDate: moment(todayIST).add(Number(plan[0].day), "days"),
      userTransactionId: transaction.id,
      status: commonData.SubscriptionStatus.ACTIVE,
    });
    res.status(201).json({
      status: "success",
      message: "Basic plan added successfully",
      data: addData,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
