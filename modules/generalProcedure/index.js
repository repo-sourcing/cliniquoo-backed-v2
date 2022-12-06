const express = require("express");
const router = express.Router();
const { create, edit, remove, getAll } = require("./controller");
const upload = require("../../utils/fileUploads");
const {
  generalProcedureValidation,
  updateGeneralProcedureValidation,
} = require("./validation");

router
  .route("/")
  .get(getAll)
  .post(upload.single("icon"), generalProcedureValidation, create);
router
  .route("/:id")
  .patch(upload.single("icon"), updateGeneralProcedureValidation, edit)
  .delete(remove);

module.exports = router;
