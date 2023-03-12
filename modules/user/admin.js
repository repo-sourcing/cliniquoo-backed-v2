const express = require("express");
const router = express.Router();

const {
  getAll,
  getOne,
  getDeleteRequestUser,
  restoreDeleteUser,
} = require("./controller");

router.route("/").get(getAll);
router.route("/getDeleteRequestUser").get(getDeleteRequestUser);
router.route("/restoreDeleteUser").post(restoreDeleteUser);
router.route("/:id").get(getOne);

module.exports = router;
