const express = require("express");
const router = express.Router();
const { create, edit, remove, getOne } = require("./controller");
const {
  userTransactionValidation,
  updateUserTransactionValidation,
} = require("./validation");

router.route("/").post(userTransactionValidation, create);
router
  .route("/:id")
  .patch(updateUserTransactionValidation, edit)
  .get(getOne)
  .delete(remove);

module.exports = router;
