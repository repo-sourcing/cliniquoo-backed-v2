const express = require("express");
const router = express.Router();
const { create, edit, remove, getAll } = require("./controller");
const upload = require("../../utils/fileUploads");
const {
  generalComplainValidation,
  updateGeneralComplainValidation,
} = require("./validation");

router
  .route("/")
  .get(getAll)
  .post(upload.single("icon"), generalComplainValidation, create);
router
  .route("/:id")
  .patch(upload.single("icon"), updateGeneralComplainValidation, edit)
  .delete(remove);

module.exports = router;
