const express = require("express");
const router = express.Router();
const auth = require(".././middleware/auth");
const { checkSubscription } = require("../middleware/subscription");
router.use(
  "/patient",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/patient/admin")
);
router.use(
  "/clinic",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/clinic/admin")
);
//get all users(doctor)
router.use(
  "/user",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/user/admin")
);
//get all userSubscription
router.use(
  "/userSubscription",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/userSubscription/admin")
);
//get all user transaction
router.use(
  "/userTransaction",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/userTransaction/admin")
);
//get all analytics
router.use(
  "/analytics",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/analytics/admin")
);
//daily activity
router.use(
  "/dailyActivity",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/dailyActivity/admin")
);
//all subscription
router.use(
  "/subscription",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/subscription/admin")
);
//all transaction
router.use(
  "/transaction",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/transaction/admin")
);
//all visitor
router.use(
  "/visitor",
  auth.authMiddleware,
  auth.restrictTo("Admin"),
  require("../modules/visitor/admin")
);

module.exports = router;
