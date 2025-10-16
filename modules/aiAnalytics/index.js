const express = require("express");
const router = express.Router();
const { getqueryAnalyticsByAI, getSessionData } = require("./controller");
const { subscriptionData } = require("../../middleware/authSubscription");

router.post("/", subscriptionData, getqueryAnalyticsByAI);
router.get("/:sessionId", getSessionData);

module.exports = router;
