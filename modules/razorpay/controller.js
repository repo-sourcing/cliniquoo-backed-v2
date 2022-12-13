const subscriptionService = require("../subscription/service");
const transactionService = require("../userTransaction/service");
const razorpayInstance = require("../../utils/razorpay");
const userSubscriptionService = require("../userSubscription/service");
const crypto = require("crypto");

exports.generatePayment = async (req, res, next) => {
  try {
    console.log("userId subscription------>", req.requestor.id);
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
    razorpayInstance.orders.create(options, (err, order) => {
      //STEP 3 & 4:
      if (!err)
        res.status(201).json({
          status: "success",
          message: "Add  user transaction successfully",
          data: res.json(order),
        });
      else res.send(err);
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
  console.log("webhookRes", webhookRes);
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
      const data = await userSubscriptionService.create({
        date: new Date(),
        userId: webhookRes.notes.UserId,
        subscriptionId: webhookRes.notes.UserId,
      });
    } else {
      // pass it
      console.log("request is not legit");
      console.log("digest not matched while verifying after the payment!");
    }
  }
};
