const express = require("express");
const router = express.Router();

const { create, getAllByUser, edit, remove } = require("./controller");

router.route("/").post(create).get(getAllByUser);
router.route("/:id").patch(edit).delete(remove);

module.exports = router;
