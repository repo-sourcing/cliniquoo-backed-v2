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
  mobileCheck,
} = require("./controller");
const { userValidation, updateUserValidation } = require("./validation");

router
  .route("/")
  .get(getAll)
  .patch(
    auth.authMiddleware,
    upload.single("profilePic"),
    updateUserValidation,
    update
  );
router.get("/getMe", auth.authMiddleware, getMe);
router.post("/sendOTP", sendOTP);
router.post("/verifyUser", verifyUser);
router.post("/mobileCheck", mobileCheck);
router.post("/signup", upload.single("profilePic"), signup);
router
  .route("/:id")
  .get(getOne)
  .delete(remove)
  .patch(auth.authMiddleware, update);
router.get("/search/:name", search);
module.exports = router;
