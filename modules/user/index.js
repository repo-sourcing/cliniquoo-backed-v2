const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const upload = require("../../utils/fileUploads");

const {
  sendOTP,
  signup,
  getMe,
  update,
  remove,
  search,
  mobileCheck,
  verifyOTP,
} = require("./controller");
const {
  userValidation,
  sendOTPValidation,
  updateUserValidation,
  verifyOTPValidation,
} = require("./validation");

router
  .route("/")
  .patch(
    auth.authMiddleware,
    upload.single("profilePic"),
    updateUserValidation,
    update
  );
router.get("/getMe", auth.authMiddleware, getMe);
router.post("/sendOTP", sendOTPValidation, sendOTP);
router.post("/verifyOTP", verifyOTPValidation, auth.mobileProtected, verifyOTP);
router.post("/mobileCheck", mobileCheck);
router.post(
  "/signup",
  auth.verifiedCheck,
  upload.single("profilePic"),
  userValidation,
  signup
);
router
  .route("/:id")
  .delete(remove)
  .patch(auth.authMiddleware, update);
router.get("/search/:name", search);
module.exports = router;
