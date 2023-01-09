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
} = require("./controller");
const { patientValidation, updatePatientValidation } = require("./validation");

router.route("/").get(getAllByUser).post(patientValidation, create);
router
  .route("/:id")
  .patch(updatePatientValidation, edit)
  .delete(remove)
  .get(getOne);
router.route("/search/:name").get(getSearch);
router.route("/searchByDate/:name").get(getSearchByDate);

module.exports = router;
