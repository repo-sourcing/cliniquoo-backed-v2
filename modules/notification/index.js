const express = require("express");
const router = express.Router();
const {
  create,
  getMyNotification,
  removeAll,
  update,
  removeOne,
  sendToTopic,
} = require("./controller");

router.route("/").get(getMyNotification).post(create);
router.route("/clearAll").delete(removeAll);
router.route("/sendToTopic").post(sendToTopic);

router.route("/:id").delete(removeOne);

module.exports = router;
