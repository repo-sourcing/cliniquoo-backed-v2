const express = require("express");
const router = express.Router();
const { getqueryAnalyticsByAI, getSessionData } = require("./controller");

router.post("/", getqueryAnalyticsByAI);
router.get("/:sessionId", getSessionData);

module.exports = router;
