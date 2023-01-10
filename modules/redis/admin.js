const express = require("express");
const router = express.Router();
const { flushAll } = require("./controller");

router.route("/").get(flushAll);
module.exports = router;
