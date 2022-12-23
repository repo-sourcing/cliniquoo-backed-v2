const express = require("express");
const router = express.Router();
const { create, getAll, edit, remove, getOne } = require("./controller");
const {
  subscriptionValidation,
  updateSubscriptionValidation,
} = require("./validation");

router.route("/").get(getAll).post(subscriptionValidation, create);
router
  .route("/:id")
  .patch(updateSubscriptionValidation, edit)
  .delete(remove)
  .get(getOne);

module.exports = router;
