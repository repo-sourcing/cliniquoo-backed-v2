const express = require("express");
const router = express.Router();
const { create, edit, remove, getAll } = require("./controller");
const upload = require("../../utils/fileUploads");
const {
  generalTreatmentValidation,
  updateGeneralTreatmentValidation,
} = require("./validation");

router
  .route("/")
  .get(getAll)
  .post(upload.single("icon"), generalTreatmentValidation, create);
router
  .route("/:id")
  .patch(upload.single("icon"), updateGeneralTreatmentValidation, edit)
  .delete(remove);

module.exports = router;
