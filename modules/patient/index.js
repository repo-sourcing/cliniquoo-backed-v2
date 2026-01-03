const express = require("express");
const router = express.Router();

const {
  create,
  getAll,
  getSearch,
  edit,
  remove,
  getAllByUser,
  getOne,
  getSearchByDate,
  getPatientsWithPendingAmount,
  uploadFiles,
  deleteFile,
} = require("./controller");
const { patientValidation, updatePatientValidation } = require("./validation");
const { subscriptionData } = require("../../middleware/authSubscription");

const upload = require("../../utils/fileUploads");

router
  .route("/")
  .get(getAllByUser)
  .post(patientValidation, subscriptionData, create);
router.route("/pending-amounts").get(getPatientsWithPendingAmount);

router.post("/files", upload.array("file"), subscriptionData, uploadFiles);
router.delete("/files", deleteFile);
router
  .route("/:id")
  .patch(updatePatientValidation, edit)
  .delete(remove)
  .get(getOne);
router.route("/search/:name").get(getSearch);
router.route("/searchByDate/:name").get(getSearchByDate);

module.exports = router;
