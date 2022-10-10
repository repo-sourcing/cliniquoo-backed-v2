const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const upload = require("../../utils/fileUploads");

const {
  sendOTP,
  verifyUser,
  signup,
  getMe,
  update,
  getOne,
  remove,
  getAll,
  search,
} = require("./controller");

router
  .route("/")
  .get(getAll)
  .patch(auth.authMiddleware, upload.single("profilePic"), update);
router.get("/getMe", auth.authMiddleware, getMe);
router.post("/sendOTP", sendOTP);
router.post("/verifyUser", verifyUser);
router.post("/signup", upload.single("profilePic"), signup);
router.route("/:id").get(getOne).delete(remove);
router.get("/search/:name", search);
module.exports = router;
