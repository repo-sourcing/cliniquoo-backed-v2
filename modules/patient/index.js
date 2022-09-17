const express = require("express");
const router = express.Router();
const upload = require("../../utils/fileUploads");
const { create, getAll, getByDate, edit, remove } = require("./controller");

router.route("/").get(getAll).post(create);
router.get("/getByDate", getByDate);
router.route("/:id").patch(edit).delete(remove);

module.exports = router;
