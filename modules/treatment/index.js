const express = require("express");
const router = express.Router();
const {
  create,
  getAll,
  getBill,
  edit,
  remove,
  ongoingProcessTeeth,
} = require("./controller");
const {
  treatmentValidation,
  updateTreatmentValidation,
} = require("./validation");

router.route("/").get(getAll).post(treatmentValidation, create);
router.route("/ongoingProcessTeeth").get(ongoingProcessTeeth);
router.route("/bill").get(getBill);
router.route("/:id").patch(updateTreatmentValidation, edit).delete(remove);

module.exports = router;
