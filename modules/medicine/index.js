const express = require("express");
const router = express.Router();
const { create, getAllByUser } = require("./controller");
const { medicineValidation } = require("./validation");

router.route("/").post(medicineValidation, create).get(getAllByUser);

module.exports = router;
