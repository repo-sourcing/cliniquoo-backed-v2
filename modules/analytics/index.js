const express = require("express");
const router = express.Router();
const { getAll, getDashboardAnalytics } = require("./controller");

router.get("/", getAll);
router.get("/dashboard", getDashboardAnalytics);

module.exports = router;
