const express = require("express");
const { getOne } = require("../user/controller");
const router = express.Router();
const {
  create,
  edit,
  remove,
  getOneByUser,
  addBasicPlan,
} = require("./controller");
const {
  subscriptionValidation,
  updateSubscriptionValidation,
} = require("./validation");
const { subscriptionData } = require("../../middleware/authSubscription");

router.route("/").post(subscriptionValidation, create).get(getOneByUser);
router.route("/addBasicPlan").post(subscriptionData, addBasicPlan);
router.route("/:id").patch(updateSubscriptionValidation, edit).delete(remove);

module.exports = router;
