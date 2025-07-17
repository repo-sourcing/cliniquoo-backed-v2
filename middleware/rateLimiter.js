"use strict";
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const client = require("../utils/redis");

exports.otpVerificationLimit = rateLimit({
  windowMs: 1 * 60 * 1000, //In one minute
  max: 3, // Limit each IP to 3 requests per `window` (here, per 1 minute)
  message: (req, res, next) => {
    res.status(429).json({
      status: "fail",
      message:
        "You have exceeded the rate limit for otp verification. Please try again later.",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  }),

  keyGenerator: function (req) {
    // return `otpVerify:${req.ip}:${req.originalUrl}`;
    return `otpVerificationLimit-
      ${req?.headers?.["x-forwarded-for"]} ||
        ${req?.headers?.["x-real-ip"]} ||
          ${req?.user?.id} ||
            ${req?.ip}`;
  },
});
exports.resendOTPLimit = rateLimit({
  windowMs: 3 * 60 * 1000, // 30 minutes
  max: 5, // Limit each IP to 5 requests per `window` (here, per 30 minutes)
  message: (req, res) => {
    res.status(429).json({
      status: "fail",
      message:
        "You have exceeded the rate limit for resend otp. Please try again later.",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  }),

  keyGenerator: function (req) {
    // return `resendOtp:${req.ip}:${req.originalUrl}`;
    return `resendOTPLimit-
      ${req?.headers?.["x-forwarded-for"]} ||
        ${req?.headers?.["x-real-ip"]} ||
          ${req?.user?.id} ||
            ${req?.ip}`;
  },
});

exports.otpSendLimit = rateLimit({
  windowMs: 3 * 60 * 1000, //3 minutes
  max: 5, // Limit each IP to 3 requests per `window` (here, per 3 minutes)
  message: (req, res, next) => {
    res.status(429).json({
      status: "fail",
      message:
        "You have exceeded the rate limit for send otp. Please try again later.",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  }),

  keyGenerator: function (req) {
    // return `otpSend:${req.ip}:${req.originalUrl}`;
    return `otpSendLimit-
    ${req?.headers?.["x-forwarded-for"]} ||
      ${req?.headers?.["x-real-ip"]} ||
        ${req?.user?.id} ||
          ${req?.ip}`;
  },
});
