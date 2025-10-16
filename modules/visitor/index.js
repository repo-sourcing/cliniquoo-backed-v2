const express = require("express");
const router = express.Router();
const {
  create,
  getAll,
  edit,
  remove,
  getAllVisitorByDate,
  countOfvisitorForAllDates,
  findNotVisited,
  schedule,
  reschedule,
} = require("./controller");
const {
  visitorValidation,
  updateVisitorValidation,
  rescheduleValidation,
  scheduleValidation,
} = require("./validation");
const { subscriptionData } = require("../../middleware/authSubscription");

router.route("/").get(getAll).post(visitorValidation, create);
router
  .route("/reschedule")
  .patch(rescheduleValidation, subscriptionData, reschedule);
router.route("/schedule").post(scheduleValidation, subscriptionData, schedule);
router.route("/:id").patch(updateVisitorValidation, edit).delete(remove);
router.route("/info/visiterInfoByDate").get(getAllVisitorByDate);
router.route("/info/findNotVisited").get(findNotVisited);
router.route("/info/countOfVisitors").get(countOfvisitorForAllDates);

module.exports = router;
