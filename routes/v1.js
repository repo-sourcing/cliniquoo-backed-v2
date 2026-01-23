const express = require("express");
const router = express.Router();
const auth = require(".././middleware/auth");
const { checkSubscription } = require("../middleware/subscription");

router.use(
  "/transaction",
  auth.authMiddleware,
  require("../modules/transaction"),
);
router.use("/visitor", auth.authMiddleware, require("../modules/visitor"));
router.use("/treatment", auth.authMiddleware, require("../modules/treatment"));
router.use("/clinic", auth.authMiddleware, require("../modules/clinic"));
router.use("/patient", auth.authMiddleware, require("../modules/patient"));
router.use(
  "/notification",
  auth.authMiddleware,
  require("../modules/notification"),
);
router.use("/analytics", auth.authMiddleware, require("../modules/analytics"));
router.use(
  "/medicalHistory",
  auth.authMiddleware,
  require("../modules/medicalHistory"),
);
router.use(
  "/generalTreatment",
  auth.authMiddleware,
  require("../modules/generalTreatment"),
);
router.use(
  "/generalProcedure",
  auth.authMiddleware,
  require("../modules/generalProcedure"),
);
router.use(
  "/generalComplain",
  auth.authMiddleware,
  require("../modules/generalComplaint"),
);
router.use(
  "/subscription",
  auth.authMiddleware,
  require("../modules/subscription"),
);
router.use(
  "/userSubscription",
  auth.authMiddleware,
  require("../modules/userSubscription"),
);
router.use(
  "/dailyActivity",
  auth.authMiddleware,
  require("../modules/dailyActivity"),
);
router.use(
  "/userTransaction",
  auth.authMiddleware,
  require("../modules/userTransaction"),
);
router.use("/download", auth.authMiddleware, require("../modules/download"));
router.use("/payment", require("../modules/razorpay"));
router.use("/user", require("../modules/user"));
router.use("/config", require("../modules/config"));
router.use("/service", require("../modules/log"));
router.use("/medicine", auth.authMiddleware, require("../modules/medicine"));
router.use(
  "/prescription",
  auth.authMiddleware,
  require("../modules/prescription"),
);
router.use("/template", auth.authMiddleware, require("../modules/template"));
router.use(
  "/frequentlyUsedMedicine",
  auth.authMiddleware,
  require("../modules/frequentlyUsedMedicine"),
);
router.use(
  "/treatmentPlan",
  auth.authMiddleware,
  require("../modules/treatmentPlan"),
);
router.use(
  "/aiAnalytics",
  auth.authMiddleware,
  require("../modules/aiAnalytics"),
);
router.use(
  "/appointmentReminders",
  auth.authMiddleware,
  require("../modules/appointmentReminders"),
);

module.exports = router;
