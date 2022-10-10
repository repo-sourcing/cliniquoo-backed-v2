const express = require("express");
const router = express.Router();
const auth = require(".././middleware/auth");

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
router.use("/user", require("../modules/user"));
router.use("/admin", require("../modules/admin"));

module.exports = router;
