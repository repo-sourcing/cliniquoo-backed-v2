const express = require("express");
const router = express.Router();
const { create, getAll, edit, remove } = require("./controller");
const {
  treatmentValidation,
  updateTreatmentValidation,
} = require("./validation");

router.route("/").get(getAll).post(treatmentValidation, create);
router.route("/:id").patch(updateTreatmentValidation, edit).delete(remove);

module.exports = router;
