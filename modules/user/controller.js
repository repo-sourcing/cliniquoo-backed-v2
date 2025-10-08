"use strict";
const service = require("./service");
const { Op } = require("sequelize");

const auth = require("../../middleware/auth");
const firebase = require("../../utils/firebaseConfige");
const Clinic = require("../clinic/model");
const jwt = require("jsonwebtoken");
const { sqquery } = require("../../utils/query");
const redisClient = require("../../utils/redis");
const msg91Services = require("../../utils/msg91");
const { deleteClinicAndClinicRelation } = require("../clinic/controller");
const { deletePatientAndPatientRelation } = require("../patient/controller");
const Template = require("../template/model");
const Patient = require("../patient/model");
const userSubscriptionService = require("../userSubscription/service");
const Subscription = require("../subscription/model");
const subscriptionService = require("../subscription/service");
const UserTransaction = require("../userTransaction/model");
const { commonData } = require("./constant");
exports.create = async (req, res, next) => {
  try {
    // Find user with same phone number and email
    // If user found with this  phone number or email. Then throw error
    // otherwise add new data

    const { mobile, email } = req.body;
    const [userWithSamePhoneNo] = await service.get({
      where: { mobile },
    });

    // user with same phone number is  found.
    if (userWithSamePhoneNo) {
      return res.status(400).json({
        message: "This Phone Number is already register,try with another one",
      });
    }

    const [userWithSameEmail] = await service.get({
      where: { email },
    });

    // user with same email is found.
    if (userWithSameEmail) {
      return res.status(400).json({
        message: "This Email is already register,try with another one",
      });
    }
    const data = await service.create(req.body);

    res.status(201).json({
      status: 201,
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
      message: "get All use successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getDeleteRequestUser = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        deletedAt: { [Op.not]: null },
      },
      paranoid: false,
    });

    res.status(200).send({
      status: "success",
      message: "get All delete request use successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.restoreDeleteUser = async (req, res, next) => {
  try {
    console.log(req.body.id);

    const data = await service.restore(req.body.id);
    console.log(data);

    res.status(200).send({
      status: "success",
      message: "restore user successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.approveDeleteUser = async (req, res, next) => {
  try {
    const userId = req.body.id;

    await service.hardRemove(userId);
    await Clinic.destroy({
      where: {
        userId,
      },
      force: true,
    });

    res.status(200).send({
      status: "success",
      message: "restore user successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.getOne = async (req, res, next) => {
  try {
    const [data] = await service.get({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).send({
      status: "success",
      message: "Get One user successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.update = async (req, res, next) => {
  try {
    const id = req.requestor.id;
    delete req.body.mobile;
    // Handle both profilePic and signature files if they exist
    if (req.files?.profilePic?.[0]) {
      req.body.profilePic = req.files.profilePic[0].location;
    }
    if (req.files?.signature?.[0]) {
      req.body.signature = req.files.signature[0].location;
    }

    const data = await service.update(id, req.body);

    res.status(200).send({
      status: "success",
      message: "Update Me successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (req.requestor.id != id)
      return res.status(403).send({
        status: "error",
        message: "You don't have permission to delete account",
      });

    //first delete releted data

    let clinics = await Clinic.findAll({
      where: { userId: id },
      attributes: ["id"],
    });
    let clinicIds = clinics.map(clinic => clinic.id);

    // Get patient IDs
    let patients = await Patient.findAll({
      where: { userId: id },
      attributes: ["id"],
    });
    let patientIds = patients.map(patient => patient.id);
    await Promise.all([
      deleteClinicAndClinicRelation(id, clinicIds),
      deletePatientAndPatientRelation(id, patientIds),
      Template.destroy({ where: { userId: id } }),
    ]);

    await service.remove(id);

    // await redisClient.DEL(`patient?userId=${req.requestor.id}`);

    res.status(200).send({
      status: "success",
      message: "delete user successfully",
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.sendOTP = async (req, res, next) => {
  try {
    const { mobile, countryCode = 91 } = req.body;

    const deletedUser = await service.count({
      where: {
        deletedAt: { [Op.not]: null },
        mobile: mobile,
      },
      paranoid: false,
    });

    // user with same phone number is found.
    if (deletedUser > 0) {
      return res.status(200).json({
        status: "fail",
        message: "please wait for admin approve ",
      });
    }

    // let mobile = `+91${req.body.mobile * 1}`;

    const token = auth.singMobileToken(req.body.mobile * 1, false);

    const otpResponse = await msg91Services.sendOTP(mobile, countryCode);
    if (otpResponse.type !== "success")
      return next(createError(400, otpResponse.message));

    return res.status(200).json({
      status: "success",
      message: "OTP send successfully",
      token,
    });
  } catch (error) {
    console.log(error);
    next(error || createError(404, "Data not found"));
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { otp, mobile, countryCode = 91 } = req.body;
    if (req.requestor.mobile == "8128220770" && otp == "1234") {
      console.log("this is dummy mobile number");

      const token = jwt.sign({ id: 1, role: "User" }, process.env.JWT_SECRETE, {
        expiresIn: process.env.JWT_EXPIREIN,
      });
      res.status(200).json({
        status: "success",
        message: "OTP verify successfully",
        user: "old",
        token,
      });
    } else {
      let otpResponse;
      otpResponse = await msg91Services.verifyOTP(otp, mobile, countryCode);

      if (otpResponse.type != "success") {
        return next(createError(200, msg91Services.getMessage(otpResponse)));
      }

      const [user] = await service.get({
        where: {
          mobile: req.requestor.mobile,
        },
      });

      if (!user) {
        const token = await auth.singMobileToken(req.requestor.mobile, true);
        res.status(200).json({
          status: "success",
          message: "OTP verify successfully",
          user: "new",
          token,
        });
      } else {
        // Added 'else' here to prevent both conditions from running
        const token = jwt.sign(
          { id: user.id, role: "User" },
          process.env.JWT_SECRETE,
          {
            expiresIn: process.env.JWT_EXPIREIN,
          }
        );
        res.status(200).json({
          status: "success",
          message: "OTP verify successfully",
          user: "old",
          token,
        });
      }
    }
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.resendOTP = async (req, res, next) => {
  try {
    const { mobile, countryCode = 91 } = req.body;
    const otpResponse = await msg91Services.resendOTP(mobile, countryCode);
    if (otpResponse.type !== "success")
      return next(createError(200, otpResponse.message));
    const token = await auth.singMobileToken(req.body.mobile * 1, false);
    res.status(200).json({
      status: "success",
      message: "We have sent you an OTP again.",
      token,
    });
  } catch (error) {
    next(error);
  }
};
exports.signup = async (req, res, next) => {
  const mobile = req.requestor.mobile;

  try {
    const [user] = await service.get({
      where: {
        [Op.or]: [{ email: req.body.email }, { mobile }],
      },
    });

    if (user) return next(createError(200, "user already exist"));

    // req.body.emailUid = jwtUser.id;
    // Handle both profilePic and signature files
    req.body.profilePic = req.files?.profilePic?.[0]?.location || null;
    req.body.signature = req.files?.signature?.[0]?.location || null;
    req.body.mobile = mobile;
    const data = await service.create(req.body);

    const token = jwt.sign(
      { id: data.id, role: "User" },
      process.env.JWT_SECRETE,
      {
        expiresIn: process.env.JWT_EXPIREIN,
      }
    );

    res.status(200).send({
      status: "success",
      message: "User signup Successfully",
      data,
      token,
    });
  } catch (err) {
    next(err);
  }
};
exports.getMe = async (req, res, next) => {
  try {
    const [data] = await service.get({
      where: {
        id: req.requestor.id,
      },
      include: [Clinic],
    });
    if (!data) {
      return next(createError(404, "User not found"));
    }
    //find subscription
    const subscription = await this.findUserSubscription(req.requestor.id);

    res.status(200).send({
      status: "success",
      message: "getMe successfully",
      data,
      planData: {
        feature: commonData.subscriptionPlans,
        subscriptionData: subscription,
      },
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};
exports.search = async (req, res, next) => {
  try {
    const data = await service.get({
      where: {
        name: {
          [Op.like]: `${req.params.name}%`,
        },
      },
      attributes: ["id", "name", "profilePic"],
    });

    res.status(200).send({
      status: "success",
      message: "search user successfully",
      data,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.mobileCheck = async (req, res, next) => {
  try {
    const [data] = await service.get({
      where: {
        mobile: req.body.mobile,
      },
    });
    if (data)
      return res.status(200).json({
        status: "success",
        message: "user available",
        available: true,
        email: data.email,
      });

    res.status(200).json({
      status: "success",
      message: "user not available",
      available: false,
    });
  } catch (error) {
    next(error || createError(404, "Data not found"));
  }
};

exports.findUserSubscription = async userId => {
  try {
    //find user active subscription
    const [subscription] = await userSubscriptionService.get({
      where: {
        userId,
        status: "active",
      },
      include: [
        {
          model: Subscription,
          attributes: ["id", "name", "planType", "price"],
        },
      ],
    });

    let subscriptionData = {};
    if (!subscription) {
      // No active subscription, check for expired Pro plan
      const [expiredPro] = await userSubscriptionService.get({
        where: {
          userId,
          status: "expired",
        },
        include: [
          {
            model: Subscription,
            where: { planType: "Pro Plan" },
            attributes: ["id", "name", "planType", "price", "day"],
          },
        ],
        order: [["expiryDate", "DESC"]],
      });
      if (expiredPro) {
        await userSubscriptionService.update(
          { status: "active" },
          { userId, status: "inactive" }
        );
        subscriptionData.name = "Basic Plan";
        subscriptionData.expiryDate = null;
        subscriptionData.planType = "Basic Plan";
        return subscriptionData;
      } else {
        //get a free plan from subscription table
        const [freePlan] = await subscriptionService.get({
          where: {
            planType: "Free Plan",
          },
        });
        if (freePlan) {
          const transactionData = await UserTransaction.create({
            userId,
            subscriptionId: freePlan.id,
            amount: freePlan.price,
            status: "success",
          });
          await userSubscriptionService.create({
            userId,
            subscriptionId: freePlan.id,
            //expiry date is current date + freePlan.days
            expiryDate: null,
            // expiryDate: moment()
            //   .add(Number(freePlan.days), "days")
            //   .format("YYYY-MM-DD"),
            status: "active",
            patientLimit: commonData.patientLimit,
            userTransactionId: transactionData.id,
          });
          (subscriptionData.name = "free Plan"),
            (subscriptionData.planType = "free Plan"),
            (subscriptionData.expiryDate = null);
          subscriptionData.plan = "free Plan";

          //total patientCount
          const patientCount = await Patient.count({
            where: {
              userId,
            },
          });
          subscriptionData.patientCount = patientCount;
          subscriptionData.patientLimit = commonData.patientLimit;
          return subscriptionData;
        }
      }
    } else {
      subscriptionData.name = subscription.subscription.name;
      subscriptionData.expiryDate = subscription.expiryDate;
      subscriptionData.planType = subscription.subscription.planType;
      if (subscription.subscription.planType === "Free Plan") {
        subscriptionData.patientLimit = subscription.patientLimit;
        //add patient count
        const patientCount = await Patient.count({
          where: {
            userId,
          },
        });
        subscriptionData.patientCount = patientCount;
      } else {
        subscriptionData.patientLimit = "unlimited";
        subscriptionData.patientCount = "unlimited";
      }
      return subscriptionData;
    }
  } catch (error) {
    console.log(error);
  }
};
