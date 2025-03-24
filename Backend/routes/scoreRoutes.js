const express = require("express");
const { calculateScore,getTotalScore } = require("../controllers/scoreController.js");
const {CollectData}= require('../controllers/NewScoreController.js')

const router = express.Router();

// ✅ Use GET request & dynamic parameters
router.get("/get-score/prop", calculateScore);

router.post("/get-score", CollectData);



router.get("/total-score/:privyId", getTotalScore);

module.exports = router;


