const express = require("express");
const router = express.Router();

const { getAll, editPatientLimit } = require("./controller");
const { updatePatientLimitValidation } = require("./validation");

router.route("/").get(getAll);
router
  .route("/updatePatientLimit/:id")
  .patch(updatePatientLimitValidation, editPatientLimit);

module.exports = router;
