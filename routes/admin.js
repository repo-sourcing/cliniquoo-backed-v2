const express = require("express");
const router = express.Router();
const auth = require(".././middleware/auth");
const { checkSubscription } = require("../middleware/subscription");

router.use(
  "/patient",
  auth.authMiddleware,
  require("../modules/patient/admin")
);
router.use("/clinic", auth.authMiddleware, require("../modules/clinic/admin"));
//get all users(doctor)
router.use("/user", auth.authMiddleware, require("../modules/user/admin"));
//get all userSubscription
router.use(
  "/userSubscription",
  auth.authMiddleware,
  require("../modules/userSubscription/admin")
);
//get all user transaction
router.use(
  "/userTransaction",
  auth.authMiddleware,
  require("../modules/userTransaction/admin")
);
//get all analytics
router.use(
  "/analytics",
  auth.authMiddleware,
  require("../modules/analytics/admin")
);
//daily activity
router.use(
  "/dailyActivity",
  auth.authMiddleware,
  require("../modules/dailyActivity/admin")
);
//all subscription
router.use(
  "/subscription",
  auth.authMiddleware,
  require("../modules/subscription/admin")
);
//all transaction
router.use(
  "/transaction",
  auth.authMiddleware,
  require("../modules/transaction/admin")
);
//all visitor
router.use(
  "/visitor",
  auth.authMiddleware,
  require("../modules/visitor/admin")
);

module.exports = router;
