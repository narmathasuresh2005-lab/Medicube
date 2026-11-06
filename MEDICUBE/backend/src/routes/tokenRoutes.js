const express = require("express");

const {
  createToken,
  getTokenStatus,
} = require("../controllers/tokenController");

const router = express.Router();

// Generate token
router.post("/", createToken);

// Get token status
router.get("/status/:tokenNumber", getTokenStatus);

module.exports = router;