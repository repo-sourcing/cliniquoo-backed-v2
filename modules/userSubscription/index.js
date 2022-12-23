const express = require("express");
const { getOne } = require("../user/controller");
const router = express.Router();
const { create, edit, remove, getOneByUser } = require("./controller");
const {
  subscriptionValidation,
  updateSubscriptionValidation,
} = require("./validation");

router.route("/").post(subscriptionValidation, create).get(getOneByUser);
router.route("/:id").patch(updateSubscriptionValidation, edit).delete(remove);

module.exports = router;
