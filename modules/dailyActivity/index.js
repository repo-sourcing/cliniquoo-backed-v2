const express = require("express");
const router = express.Router();
const { create, getAll } = require("./controller");
const {} = require("./validation");

router.route("/").post(create);
router.route("/:userId").get(getAll);

module.exports = router;
