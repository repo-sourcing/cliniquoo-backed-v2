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
  resendOTP,
  planHistory,
} = require("./controller");
const {
  userValidation,
  sendOTPValidation,
  updateUserValidation,
  verifyOTPValidation,
} = require("./validation");
const {
  otpSendLimit,
  otpVerificationLimit,
  resendOTPLimit,
} = require("../../middleware/rateLimiter");

router.route("/").patch(
  auth.authMiddleware,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  updateUserValidation,
  update
);
router.get("/getMe", auth.authMiddleware, getMe);
router.post("/sendOTP", otpSendLimit, sendOTPValidation, sendOTP);
router.post("/resendOTP", resendOTPLimit, sendOTPValidation, resendOTP);

router.post(
  "/verifyOTP",
  otpVerificationLimit,
  verifyOTPValidation,
  auth.mobileProtected,
  verifyOTP
);
router.post("/mobileCheck", mobileCheck);
router.post(
  "/signup",
  auth.verifiedCheck,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  userValidation,
  signup
);
router
  .route("/:id")
  .delete(auth.authMiddleware, remove)
  .patch(auth.authMiddleware, update);
router.get("/search/:name", search);
router.get("/planHistory", auth.authMiddleware, planHistory);
module.exports = router;
