const express = require("express");
const router = express.Router();
const { create, getAll, getBill, edit, remove } = require("./controller");
const{treatmentValidation,updateTreatmentValidation}=require("./validation")

router.route("/").get(getAll).post(treatmentValidation,create);
router.route("/bill").get(getBill);
router.route("/:id").patch(updateTreatmentValidation,edit).delete(remove);

module.exports = router;
