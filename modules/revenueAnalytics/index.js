const express = require("express");
const controller = require("./controller");

const router = express.Router();

/**
 * Revenue Analytics Routes
 * Base: /api/v1/revenueAnalytics
 * Auth applied at routes/v1.js level
 */

// GET /revenueAnalytics/:clinicId/summary
router.get("/:clinicId/summary", controller.getSummary);

// GET /revenueAnalytics/:clinicId/daily?from=&to=
router.get("/:clinicId/daily", controller.getDaily);

// GET /revenueAnalytics/:clinicId/monthly?year=
router.get("/:clinicId/monthly", controller.getMonthly);

// GET /revenueAnalytics/:clinicId/breakdown?from=&to=
router.get("/:clinicId/breakdown", controller.getBreakdown);

// GET /revenueAnalytics/:clinicId/outstanding?from=&to=
router.get("/:clinicId/outstanding", controller.getOutstanding);

// GET /revenueAnalytics/:clinicId/trend?period1From=&period1To=&period2From=&period2To=
router.get("/:clinicId/trend", controller.getTrend);

module.exports = router;
