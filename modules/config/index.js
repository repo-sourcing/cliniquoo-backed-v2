const express = require("express");
const router = express.Router();

const { get, create, edit } = require("./controller");

router.route("/").get(get).post(create).patch(edit);
module.exports = router;
