const express = require("express");
const router = express.Router();
const { create, getAll, edit, remove } = require("./controller");
const {
  subscriptionValidation,
  updateSubscriptionValidation,
} = require("./validation");

router.route("/").get(getAll).post(subscriptionValidation, create);
router.route("/:id").patch(updateSubscriptionValidation, edit).delete(remove);

module.exports = router;
