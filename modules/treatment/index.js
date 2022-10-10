const express = require("express");
const router = express.Router();
const { create, getAll, getBill, edit, remove } = require("./controller");

router.route("/").get(getAll).post(create);
router.route("/bill").get(getBill);
router.route("/:id").patch(edit).delete(remove);

module.exports = router;
