const express = require("express");
const router = express.Router();

const {
  getAll,
  getOne,
  getDeleteRequestUser,
  restoreDeleteUser,
  approveDeleteUser,
} = require("./controller");

router.route("/").get(getAll);
router.route("/getDeleteRequestUser").get(getDeleteRequestUser);
router.route("/restoreDeleteUser").post(restoreDeleteUser);
router.route("/approveDeleteUser").post(approveDeleteUser);
router.route("/:id").get(getOne);

module.exports = router;
