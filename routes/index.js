const express = require("express");
const router = express.Router();

router.use("/api/v1", require("./v1"));
router.use("/api/v1/admin", require("./admin"));

module.exports = router;
