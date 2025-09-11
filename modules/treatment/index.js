const express = require("express");
const router = express.Router();
const {
  create,
  getAll,
  edit,
  remove,
  sendBilling,
  getInvoiceNumber,
} = require("./controller");
const {
  treatmentValidation,
  updateTreatmentValidation,
  billValidation,
} = require("./validation");

router.route("/").get(getAll).post(treatmentValidation, create);
router.route("/:id").patch(updateTreatmentValidation, edit).delete(remove);

router.route("/billing/:patientId/:clinicId").get(getInvoiceNumber);

router.route("/billing/:patientId").post(billValidation, sendBilling);

module.exports = router;
