const express = require("express");
const router = express.Router();
const { create, getAll, edit, remove } = require("./controller");

router.route("/").get(getAll).post(create);
router.route("/:id").patch(edit).delete(remove);

module.exports = router;
