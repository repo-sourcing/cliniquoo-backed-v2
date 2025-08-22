const express = require("express");
const router = express.Router();
const { create, getAll, getAllByUser, edit, getOne } = require("./controller");
const {
  prescriptionValidation,
  updatePrescriptionValidation,
} = require("./validation");

router.route("/").post(prescriptionValidation, create);

router.route("/:id").patch(updatePrescriptionValidation, edit).get(getOne);

module.exports = router;
