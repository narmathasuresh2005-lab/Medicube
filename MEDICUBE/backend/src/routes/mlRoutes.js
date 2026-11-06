const express = require("express");

const {
  predictDuration,
} = require("../controllers/mlController");

const router = express.Router();

router.post("/predict", predictDuration);

module.exports = router;