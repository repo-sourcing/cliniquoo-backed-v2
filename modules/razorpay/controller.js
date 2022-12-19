const subscriptionService = require("../subscription/service");
const transactionService = require("../userTransaction/service");
const razorpayInstance = require("../../utils/razorpay");
const userSubscriptionService = require("../userSubscription/service");
const crypto = require("crypto");
const redis = require("../../utils/redis");

exports.generatePayment = async (req, res, next) => {
  try {
    let order;
    const [data] = await subscriptionService.get({
      where: {
        id: req.body.subscriptionId,
      },
    });
    let amount = data.price;

    const options = {
      amount: amount * 100,
      currency: "INR",
      // receipt: shortid.generate(),
      payment_capture: 1,
      notes: {
        UserId: req.requestor.id,
        subscriptionId: req.body.subscriptionId,
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
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.verification = async (req, res) => {
  // do a validation
  res.json({ status: "ok" });
  // Get the data from RazorPay Webhook
  const webhookRes = req.body.payload.payment.entity;
  const shasum = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");
  if (digest === req.headers["x-razorpay-signature"]) {
    console.log("request is legit");
    //Create transaction
    const transaction = await transactionService.create({
      paymentId: webhookRes.id,
      amount: webhookRes.amount / 100,
      status: webhookRes.status,
      userId: +webhookRes.notes.UserId,
      subscriptionId: webhookRes.notes.UserId,
    });
    if (transaction.status === "captured") {
      //if order is captured then we can add entry of user subscription
      //if the user already present we can update user subscription otherwise we add user subscription
      let [data] = await userSubscriptionService.update(
        {
          date: new Date(),
          userId: webhookRes.notes.UserId,
          subscriptionId: webhookRes.notes.UserId,
        },
        {
          where: {
            userId: webhookRes.notes.UserId,
          },
        }
      );
      if (data) {
        redisClient.DEL(`checkSubscription?userId=${webhookRes.notes.UserId}`);
        return res.status(201).json({
          status: "success",
          message: "Add  user subscription successfully",
          data,
        });
      }
      let addData = await userSubscriptionService.create({
        date: new Date(),
        userId: webhookRes.notes.UserId,
        subscriptionId: webhookRes.notes.UserId,
      });

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
