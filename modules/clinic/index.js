const express = require("express");
const router = express.Router();
const { create, getAll, edit, remove, getAllByUser } = require("./controller");
const {
  clinicDataValidation,
  updateClinicDataValidation,
} = require("./validation");

router.route("/").get(getAllByUser).post(clinicDataValidation, create);
router.route("/:id").patch(updateClinicDataValidation, edit).delete(remove);

module.exports = router;
