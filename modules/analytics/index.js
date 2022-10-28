const express = require("express");
const router = express.Router();
const { getAll } = require("./controller");

router.post("/", getAll);
