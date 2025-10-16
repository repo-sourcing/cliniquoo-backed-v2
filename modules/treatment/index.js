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
const { subscriptionData } = require("../../middleware/authSubscription");
const { generateInvoice } = require("../patientBill/utils");

router
  .route("/")
  .get(getAll)
  .post(treatmentValidation, subscriptionData, create);
router.route("/:id").patch(updateTreatmentValidation, edit).delete(remove);

router
  .route("/billing/:patientId/:clinicId")
  .get(subscriptionData, getInvoiceNumber);

router
  .route("/billing/:patientId")
  .post(billValidation, subscriptionData, sendBilling);

module.exports = router;
