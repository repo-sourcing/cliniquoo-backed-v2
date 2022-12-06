const express = require("express");
const router = express.Router();
const auth = require(".././middleware/auth");

router.use("/procedure", auth.authMiddleware, require("../modules/procedure"));
router.use(
  "/transaction",
  auth.authMiddleware,
  require("../modules/transaction")
);
router.use("/visitor", auth.authMiddleware, require("../modules/visitor"));
router.use("/treatment", auth.authMiddleware, require("../modules/treatment"));
router.use("/clinic", auth.authMiddleware, require("../modules/clinic"));
router.use("/patient", auth.authMiddleware, require("../modules/patient"));
router.use(
  "/notification",
  auth.authMiddleware,
  require("../modules/notification")
);
router.use("/analytics", auth.authMiddleware, require("../modules/analytics"));
router.use(
  "/medicalHistory",
  auth.authMiddleware,
  require("../modules/medicalHistory")
);
router.use(
  "/generalTreatment",
  auth.authMiddleware,
  require("../modules/generalTreatment")
);
router.use(
  "/generalProcedure",
  auth.authMiddleware,
  require("../modules/generalProcedure")
);
router.use(
  "/generalComplain",
  auth.authMiddleware,
  require("../modules/generalComplaint")
);
router.use("/user", require("../modules/user"));
router.use("/config", require("../modules/config"));
router.use("/admin", require("../modules/admin"));

module.exports = router;
