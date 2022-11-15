const express = require("express");
const router = express.Router();

const { get, create, edit } = require("./controller");
const{configDataValidation}=require("./validation")

router.route("/").get(get).post(configDataValidation,create).patch(configDataValidation,edit);
module.exports = router;
