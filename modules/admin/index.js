const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { login, signup, getMe } = require("./controller");

router.post("/login", login);
router.post("/signup", signup);
router.get("/getMe", auth.authMiddleware, getMe);
module.exports = router;
