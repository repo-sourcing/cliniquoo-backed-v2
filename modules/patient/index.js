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
} = require("./controller");
const { patientValidation, updatePatientValidation } = require("./validation");
const { subscriptionData } = require("../../middleware/authSubscription");

router
  .route("/")
  .get(getAllByUser)
  .post(patientValidation, subscriptionData, create);
router.route("/pending-amounts").get(getPatientsWithPendingAmount);
router
  .route("/:id")
  .patch(updatePatientValidation, edit)
  .delete(remove)
  .get(getOne);
router.route("/search/:name").get(getSearch);
router.route("/searchByDate/:name").get(getSearchByDate);

module.exports = router;
