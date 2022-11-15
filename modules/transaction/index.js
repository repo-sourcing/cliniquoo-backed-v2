const express = require("express");
const router = express.Router();
const { create, getAll, getBill, edit, remove } = require("./controller");
const{transactionValidation,updateTransactionValidation}=require("./validation")

router.route("/").get(getAll).post(transactionValidation,create);
router.route("/bill").get(getBill);
router.route("/:id").patch(updateTransactionValidation,edit).delete(remove);

module.exports = router;
