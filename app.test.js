const express = require("express");
var cors = require("cors");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Health check endpoint for Docker
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use(function (req, res, next) {
  res.status(404).json({
    status: "fail",
    message: "URL Not Found",
  });
});

module.exports = app;
