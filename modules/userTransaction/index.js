const express = require("express");
const { getOne } = require("../user/controller");
const router = express.Router();
const { create, getAll, edit, remove } = require("./controller");
const {
  userTransactionValidation,
  updateUserTransactionValidation,
} = require("./validation");

router.route("/").get(getAll).post(userTransactionValidation, create);
router
  .route("/:id")
  .patch(updateUserTransactionValidation, edit)
  .delete(remove);

module.exports = router;
