const express = require("express");

require("dotenv").config();
global.createError = require("http-errors");
const cookieParser = require("cookie-parser");

const logger = require("morgan");
var cors = require("cors");

const indexRouter = require("./routes");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use("/", indexRouter);

// Start cron jobs (daily WhatsApp reminders, etc.)
require("./utils/cron");

app.use(function (req, res, next) {
  next(createError(404, "URL Not Found"));
});

const logService = require("./modules/log/service");

// error handler
app.use(async (err, req, res, next) => {
  console.log({ err });
  res.status(err.status || 500).json({
    status: "fail",
    message: err.message || "Unknown Error.",
    // stack: err.stack,
  });
  await logService.create({
    method: req.method,
    url: req.url,
    statusCode: err.status || res.statusCode,
    message: err.message || "Something went wrong!",
    stack: err.stack,
    payload: {
      params: req.params,
      body: req.body,
      query: req.query,
    },
  });
});

module.exports = app;
