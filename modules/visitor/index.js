const express = require("express");
const router = express.Router();
const upload = require("../../utils/fileUploads");
const {
  create,
  getAll,
  edit,
  remove,
  getAllVisitorByDate,
  countOfvisitorForAllDates,
  findNotVisited,
} = require("./controller");
const {
  visitorValidation,
  updateVisitorValidation,
  rescheduleValidation,
} = require("./validation");

router.route("/").get(getAll).post(visitorValidation, create);
router.route("/:id").patch(updateVisitorValidation, edit).delete(remove);
router.route("/info/visiterInfoByDate").get(getAllVisitorByDate);
router.route("/info/findNotVisited").get(findNotVisited);
router.route("/info/countOfVisitors").get(countOfvisitorForAllDates);
router.route("/reschedule").post(rescheduleValidation, create);

module.exports = router;
