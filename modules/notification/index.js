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
const{notificationValidation,updateNotificationValidation}=require("./validation")

router.route("/").get(getMyNotification).post(notificationValidation,create);
router.route("/clearAll").delete(removeAll);
router.route("/sendToTopic").post(sendToTopic);

router.route("/:id").delete(removeOne).patch(updateNotificationValidation,update);

module.exports = router;
