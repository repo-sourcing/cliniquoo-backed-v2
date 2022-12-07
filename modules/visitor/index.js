const express = require("express");
const router = express.Router();
const upload = require("../../utils/fileUploads");
const {
  create,
  getAll,
  getByDate,
  edit,
  remove,
  getAllVisitorByDate,
  countOfvisitorForAllDates,
} = require("./controller");
const {
  visitorValidation,
  updateVisitorValidation,
  rescheduleValidation,
} = require("./validation");

router.route("/").get(getAll).post(visitorValidation, create);
router.route("/:id").patch(updateVisitorValidation, edit).delete(remove);
router.route("/visiterInfoByDate").get(getAllVisitorByDate);
router.route("/countOfVisitors").get(countOfvisitorForAllDates);
router.route("/reschedule").post(rescheduleValidation, create);

module.exports = router;
