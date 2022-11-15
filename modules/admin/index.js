const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { login, signup, getMe } = require("./controller");
const{signUpValidation,loginValidation}=require("./validation")

router.post("/login",loginValidation, login);
router.post("/signup",signUpValidation, signup);
router.get("/getMe", auth.authMiddleware, getMe);
module.exports = router;
