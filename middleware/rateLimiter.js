"use strict";
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const client = require("../utils/redis");

const rateLimitIs = ({ max, windowMs, message, apiName }) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    standardHeaders: true,
    legacyHeaders: false,
    // keyGenerator: (req, res) => {
    // return `${apiName}-${req?.headers?.["x-forwarded-for"]} ||
    //           ${req?.headers?.["x-real-ip"]} ||
    //            ${ipKeyGenerator(req)}`;
    keyGenerator: (req, res) => {
      const ip =
        req?.headers?.["x-forwarded-for"] ||
        req?.headers?.["x-real-ip"] ||
        req?.ip;
      const ua = req?.headers?.["user-agent"] || "unknown";
      return `${apiName}-${ip}-${ua}`;
      //}
    },
    store: new RedisStore({
      sendCommand: (...args) => client.sendCommand(args),
    }),
    handler: (req, res) => {
      res.status(422).json({
        status: "fail",
        message: message || "Too many requests, please try again later.",
      });
    },
  });
};

exports.otpVerificationLimit = rateLimitIs({
  windowMs: 1 * 60 * 1000, //In one minute
  max: 3, // Limit each IP to 3 requests per `window` (here, per 1 minute)
  message:
    "You have exceeded the rate limit for otp verification. Please try again later.",
  apiName: "otpVerificationLimit",
});
exports.resendOTPLimit = rateLimitIs({
  windowMs: 3 * 60 * 1000, // 30 minutes
  max: 5, // Limit each IP to 5 requests per `window` (here, per 30 minutes)
  message:
    "You have exceeded the rate limit for resend otp. Please try again later.",
  apiName: "resendOTPLimit",
});

exports.otpSendLimit = rateLimitIs({
  windowMs: 3 * 60 * 1000, //3 minutes
  max: 5, // Limit each IP to 3 requests per `window` (here, per 3 minutes)
  message:
    "You have exceeded the rate limit for send otp. Please try again later.",
  apiName: "otpSendLimit",
});
