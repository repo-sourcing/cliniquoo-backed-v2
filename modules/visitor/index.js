const express = require("express");
const router = express.Router();
const upload = require("../../utils/fileUploads");
const {
  create,
  getByDate,
  edit,
  remove,
  getAllVisitorByDate,
  countOfvisitorForAllDates,
  getOne,
} = require("./controller");
const {
  visitorValidation,
  updateVisitorValidation,
  rescheduleValidation,
} = require("./validation");

router.route("/").post(visitorValidation, create);
router
  .route("/:id")
  .patch(updateVisitorValidation, edit)
  .delete(remove)
  .get(getOne);
router.route("/visiterInfoByDate").get(getAllVisitorByDate);
router.route("/countOfVisitors").get(countOfvisitorForAllDates);
router.route("/reschedule").post(rescheduleValidation, create);

module.exports = router;
