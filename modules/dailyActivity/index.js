const express = require("express");
const router = express.Router();
const { create, getAll, getAllByUser } = require("./controller");

router.route("/").post(create).get(getAllByUser);

module.exports = router;
