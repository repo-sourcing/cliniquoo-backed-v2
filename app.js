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

app.use(function (req, res, next) {
  next(createError(404, "URL Not Found"));
});

// error handler
app.use(function (err, req, res, next) {
  console.log({ err });
  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || "Unknown Error",
    stack: err.stack,
  });
});

module.exports = app;
