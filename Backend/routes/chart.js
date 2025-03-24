const express = require("express");
const router = express.Router();
const { getUserByUsername } = require("../controllers/Chartcontroller.js");

router.post("/user", getUserByUsername);

module.exports = router;
