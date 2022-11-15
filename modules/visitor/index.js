const express = require("express");
const router = express.Router();
const upload = require("../../utils/fileUploads");
const { create, getAll, getByDate, edit, remove } = require("./controller");
const {visitorValidation,updateVisitorValidation}=require('./validation')

router.route("/").get(getAll).post(visitorValidation,create);
router.route("/:id").patch(updateVisitorValidation,edit).delete(remove);

module.exports = router;
