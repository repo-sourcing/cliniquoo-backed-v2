const express = require("express");
const router = express.Router();
const {
  templateValidation,
  updateTemplateValidation,
} = require("./validation");
const { create, getAll, getAllByUser, edit, remove } = require("./controller");

router.route("/").post(templateValidation, create).get(getAllByUser);
router.route("/:id").patch(updateTemplateValidation, edit).delete(remove);

module.exports = router;
