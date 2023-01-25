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
} = require("./controller");
const {
  visitorValidation,
  updateVisitorValidation,
  rescheduleValidation,
  scheduleValidation,
} = require("./validation");

router.route("/").get(getAll).post(visitorValidation, create);
router.route("/:id").patch(updateVisitorValidation, edit).delete(remove);
router.route("/info/visiterInfoByDate").get(getAllVisitorByDate);
router.route("/info/findNotVisited").get(findNotVisited);
router.route("/info/countOfVisitors").get(countOfvisitorForAllDates);
router.route("/reschedule").post(rescheduleValidation, create);
router.route("/schedule").post(scheduleValidation, schedule);

module.exports = router;
