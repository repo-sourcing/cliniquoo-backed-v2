const express = require("express");
const { getOne } = require("../user/controller");
const router = express.Router();
const { generatePayment, verification } = require("./controller");
const { paymentValidation } = require("./validation");
const auth = require("../../middleware/auth");

router
  .route("/generatePayment")
  .post(paymentValidation, auth.authMiddleware, generatePayment);
router.route("/verification").post(verification);

module.exports = router;
