const express = require("express");
const {
  downloadPatientsWithTreatments,
  downloadPatientsWithTransactions,
} = require("./controller");
const router = express.Router();

router.route("/patients-with-treatments").get(downloadPatientsWithTreatments);
router
  .route("/patients-with-transactions")
  .get(downloadPatientsWithTransactions);

module.exports = router;
