const express = require("express");
const router = express.Router();
const { create, edit, remove, getAllByUser } = require("./controller");
const {
  clinicDataValidation,
  updateClinicDataValidation,
} = require("./validation");
const { subscriptionData } = require("../../middleware/authSubscription");

router
  .route("/")
  .get(getAllByUser)
  .post(clinicDataValidation, subscriptionData, create);
router.route("/:id").patch(updateClinicDataValidation, edit).delete(remove);

module.exports = router;
