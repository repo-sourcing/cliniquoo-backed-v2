const express = require("express");
const router = express.Router();
const auth = require(".././middleware/auth");

router.use("/patient", auth.authMiddleware, require("../modules/patient"));
router.use(
  "/notification",
  auth.authMiddleware,
  require("../modules/notification")
);
router.use("/user", require("../modules/user"));
router.use("/admin", require("../modules/admin"));

module.exports = router;
