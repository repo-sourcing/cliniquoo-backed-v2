const express = require("express");
const router = express.Router();
const { create, getAll, edit, remove } = require("./controller");
const {
  clinicDataValidation,
  updateClinicDataValidation,
} = require("./validation");

router.route("/").get(getAll).post(clinicDataValidation, create);
router.route("/:id").patch(updateClinicDataValidation, edit).delete(remove);

module.exports = router;
