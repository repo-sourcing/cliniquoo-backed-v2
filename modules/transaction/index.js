const express = require("express");
const router = express.Router();
const { create, getBill, edit, remove, getAllByUser } = require("./controller");
const {
  transactionValidation,
  updateTransactionValidation,
} = require("./validation");

router.route("/").get(getAllByUser).post(transactionValidation, create);
router.route("/bill").get(getBill);
router.route("/:id").patch(updateTransactionValidation, edit).delete(remove);

module.exports = router;
