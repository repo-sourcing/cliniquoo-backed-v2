const express = require("express");
const router = express.Router();
const { getAll, getOne } = require("./controller");

router.route("/").get(getAll);
router.route("/:id").get(getOne);

module.exports = router;
