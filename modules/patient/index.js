const express = require("express");
const router = express.Router();

const { create, getAll, getSearch, edit, remove } = require("./controller");

router.route("/").get(getAll).post(create);
router.route("/:id").patch(edit).delete(remove);
router.route("/search/:name").get(getSearch);

module.exports = router;
