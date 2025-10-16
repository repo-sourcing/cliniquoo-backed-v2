const express = require("express");
const router = express.Router();
const { create, getBill, edit, remove, getAllByUser } = require("./controller");
const {
  transactionValidation,
  updateTransactionValidation,
} = require("./validation");
const { subscriptionData } = require("../../middleware/authSubscription");

router
  .route("/")
  .get(getAllByUser)
  .post(transactionValidation, subscriptionData, create);
router.route("/bill").get(getBill);
router.route("/:id").patch(updateTransactionValidation, edit).delete(remove);

module.exports = router;
