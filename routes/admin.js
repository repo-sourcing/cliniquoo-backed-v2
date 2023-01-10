const express = require("express");
const router = express.Router();
const auth = require(".././middleware/auth");
const { checkSubscription } = require("../middleware/subscription");
router.use("/", require("../modules/admin"));

router.use(auth.authMiddleware);
router.use(auth.restrictTo("Admin"));
router.use("/patient", require("../modules/patient/admin"));
router.use("/clinic", require("../modules/clinic/admin"));
//get all users(doctor)
router.use("/user", require("../modules/user/admin"));
//get all userSubscription
router.use("/userSubscription", require("../modules/userSubscription/admin"));
//get all user transaction
router.use("/userTransaction", require("../modules/userTransaction/admin"));
//get all analytics
router.use("/analytics", require("../modules/analytics/admin"));
//daily activity
router.use("/dailyActivity", require("../modules/dailyActivity/admin"));
//all subscription
router.use("/subscription", require("../modules/subscription/admin"));
//all transaction
router.use("/transaction", require("../modules/transaction/admin"));
//all treatment
router.use("/treatment", require("../modules/treatment/admin"));
//all visitor
router.use("/visitor", require("../modules/visitor/admin"));

//configration
router.use("/config", require("../modules/config/admin"));

router.use("/flushAll", require("../modules/redis/admin"));

module.exports = router;
