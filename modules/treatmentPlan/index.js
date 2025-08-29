const express = require("express");
const router = express.Router();
const {
  treatmentValidation,
  updateTreatmenteValidation,
} = require("./validation");
const { create, getAll, getAllByUser, edit, remove } = require("./controller");

router.route("/").post(treatmentValidation, create).get(getAllByUser);
router.route("/:id").patch(updateTreatmenteValidation, edit).delete(remove);

module.exports = router;
