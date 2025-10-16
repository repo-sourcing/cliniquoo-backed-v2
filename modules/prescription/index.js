const express = require("express");
const router = express.Router();
const { create, edit, getOne, sendPrescription } = require("./controller");
const {
  prescriptionValidation,
  updatePrescriptionValidation,
} = require("./validation");
const { subscriptionData } = require("../../middleware/authSubscription");

router.route("/").post(prescriptionValidation, subscriptionData, create);
router.route("/send/:id").get(subscriptionData, sendPrescription);

router.route("/:id").patch(updatePrescriptionValidation, edit).get(getOne);

module.exports = router;
