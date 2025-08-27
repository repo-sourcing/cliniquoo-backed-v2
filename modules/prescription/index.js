const express = require("express");
const router = express.Router();
const { create, edit, getOne, sendPrescription } = require("./controller");
const {
  prescriptionValidation,
  updatePrescriptionValidation,
} = require("./validation");

router.route("/").post(prescriptionValidation, create);
router.route("/send/:id").get(sendPrescription);

router.route("/:id").patch(updatePrescriptionValidation, edit).get(getOne);

module.exports = router;
