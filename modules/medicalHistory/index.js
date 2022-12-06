const express = require("express");
const router = express.Router();
const { create, edit, remove, getOne } = require("./controller");
const {
  medicalHistoryValidation,
  updateMedicalHistoryValidation,
} = require("./validation");

router.route("/").post(medicalHistoryValidation, create);
router.route("/:id").patch(updateMedicalHistoryValidation, edit).delete(remove);
router.route("/:patientId").get(getOne);

module.exports = router;
