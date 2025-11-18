const subscriptionService = require("../subscription/service");
const transactionService = require("../userTransaction/service");
const razorpayInstance = require("../../utils/razorpay");
const userSubscriptionService = require("../userSubscription/service");

const crypto = require("crypto");
const redis = require("../../utils/redis");
const { start } = require("repl");
const moment = require("moment-timezone");
const { commonData } = require("../user/constant");
const Subscription = require("../subscription/model");
const { Op } = require("sequelize");
const { assignTimeSlotsAfterUpgrade } = require("./utils");
const createHttpError = require("http-errors");

exports.generatePayment = async (req, res, next) => {
  try {
    let order;
    const [data] = await subscriptionService.get({
      where: {
        id: req.body.subscriptionId,
      },
    });
    if (!data) {
      return next(createError(404, "Subscription not found"));
    }

    let amount = data.price;

    const options = {
      amount: amount * 100,
      currency: "INR",
      // receipt: shortid.generate(),
      payment_capture: 1,
      notes: {
        userId: req.requestor.id,
        subscriptionId: req.body.subscriptionId,
        day: data.day,
        planType: data.planType,
      },
    };
    try {
      order = await razorpayInstance.orders.create(options);
    } catch (err) {
      return next(createHttpError(err.statusCode, err.error.description));
    }
    res.status(200).json({
      status: 200,
      message: "Add  user transaction successfully",
      data: {
        //RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
        order,
      },
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.verification = async (req, res) => {
  // do a validation
  // res.json({ status: "ok" });
  // Get the data from RazorPay Webhook
  const tomorrow = moment.tz("Asia/Kolkata").add(1, "day").format("YYYY-MM-DD");
  const todayIST = moment
    .tz("Asia/Kolkata")
    .startOf("day")
    .format("YYYY-MM-DD");

  const webhookRes = req.body.payload.payment.entity;
  const shasum = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");
  if (digest === req.headers["x-razorpay-signature"]) {
    //Create transaction
    const transaction = await transactionService.create({
      paymentId: webhookRes.id,
      amount: webhookRes.amount / 100,
      status: webhookRes.status,
      userId: +webhookRes.notes.userId,
      subscriptionId: webhookRes.notes.subscriptionId,
    });
    if (transaction.status === "captured") {
      //if order is captured then we can add entry of user subscription
      //if the user already present we can update user subscription otherwise we add user subscription

      //first find the active plan
      const [activePlan] = await userSubscriptionService.get({
        where: {
          userId: +webhookRes.notes.userId,
          status: commonData.SubscriptionStatus.ACTIVE,
        },
        include: [
          {
            model: Subscription,
          },
        ],
        order: [["expiryDate", "DESC"]],
      });

      // 3️⃣ Calculate start and expiry dates for new plan
      let startDate, status;

      if (activePlan) {
        if (activePlan.expiryDate == null) {
          const [lastPlan] = await userSubscriptionService.get({
            where: {
              userId: webhookRes.notes.userId,
              status: {
                [Op.in]: [commonData.SubscriptionStatus.PENDING],
              },
            },
            order: [["expiryDate", "DESC"]],
          });
          if (lastPlan) {
            if (lastPlan.expiryDate == null) {
              // so it is a basic plan so of it subscribed with another plan then we don't need this entry
              await userSubscriptionService.update(
                {
                  status: commonData.SubscriptionStatus.EXPIRE,
                },
                {
                  where: {
                    userId: +webhookRes.notes.userId,
                    status: commonData.SubscriptionStatus.PENDING,
                    id: lastPlan.id,
                  },
                }
              );
              startDate = todayIST;
              status = commonData.SubscriptionStatus.ACTIVE;
            } else {
              startDate = moment(lastPlan.expiryDate)
                .add(1, "day")
                .format("YYYY-MM-DD");
              status = commonData.SubscriptionStatus.PENDING;
            }
          } else {
            startDate = todayIST;
            status = commonData.SubscriptionStatus.ACTIVE;
          }
        } else if (activePlan.expiryDate) {
          const [lastPlan] = await userSubscriptionService.get({
            where: {
              userId: webhookRes.notes.userId,
              status: {
                [Op.in]: [
                  commonData.SubscriptionStatus.ACTIVE,
                  commonData.SubscriptionStatus.PENDING,
                ],
              },
            },
            order: [["expiryDate", "DESC"]],
          });

          startDate = moment(lastPlan.expiryDate)
            .add(1, "day")
            .format("YYYY-MM-DD");
          status = commonData.SubscriptionStatus.PENDING;
        } else {
          // Safety fallback
          startDate = todayIST;
          status = commonData.SubscriptionStatus.ACTIVE;
        }
      } else {
        // // No active plan → start today
        startDate = todayIST;
        status = commonData.SubscriptionStatus.ACTIVE;
      }

      //  Expire any already-expired plans
      // await userSubscriptionService.update(
      //   {
      //     status: commonData.SubscriptionStatus.EXPIRE,
      //     endDate: moment().format("YYYY-MM-DD"),
      //   },
      //   {
      //     where: {
      //       userId: +webhookRes.notes.userId,
      //       status: commonData.SubscriptionStatus.ACTIVE,
      //       expiryDate: { [Op.lt]: moment().format("YYYY-MM-DD") },
      //     },
      //   }
      // );
      //if new plan id pro plan then we need to update old basic entry inactive to expired so only one entry at a time in active and active

      if (status == commonData.SubscriptionStatus.ACTIVE) {
        await userSubscriptionService.update(
          { status: commonData.SubscriptionStatus.EXPIRE, endDate: todayIST },

          {
            where: {
              userId: +webhookRes.notes.userId,
              status: commonData.SubscriptionStatus.ACTIVE,
            },
          }
        );
      }

      let addData = await userSubscriptionService.create({
        userId: webhookRes.notes.userId,
        subscriptionId: webhookRes.notes.subscriptionId,
        startDate,
        //if days is 0 then not add expiry date
        expiryDate:
          webhookRes.notes.day == 0
            ? null
            : moment(startDate).add(Number(webhookRes.notes.day), "days"),
        userTransactionId: transaction.id,
        status,
      });

      if (webhookRes.notes.planType == "Pro Plan") {
        //if pro plan then we need to add basic plan entry with inactive status with same transaction id
        //add the inactive entry with same transactionId of basic plan
        let [basicPlan] = await subscriptionService.get({
          where: {
            planType: "Basic Plan",
          },
        });

        if (basicPlan) {
          await userSubscriptionService.update(
            { status: commonData.SubscriptionStatus.EXPIRE },

            {
              where: {
                userId: +webhookRes.notes.userId,
                status: commonData.SubscriptionStatus.INACTIVE,
                subscriptionId: basicPlan.id,
              },
            }
          );
          // Add new basic plan entry as inactive
          await userSubscriptionService.create({
            userId: +webhookRes.notes.userId,
            subscriptionId: basicPlan.id,
            expiryDate: null,
            userTransactionId: transaction.id,
            status: commonData.SubscriptionStatus.INACTIVE,
          });
        }
        if (status == commonData.SubscriptionStatus.ACTIVE) {
          await assignTimeSlotsAfterUpgrade([+webhookRes.notes.userId]);
        }
      }

      res.status(201).json({
        status: "success",
        message: "Add  user subscription successfully",
        data: addData,
      });
    } else {
      // pass it
      console.log("request is not legit");
      console.log("digest not matched while verifying after the payment!");
    }
  }
};
