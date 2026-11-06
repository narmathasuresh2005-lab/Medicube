
const express = require("express");

const {
  getQueue,
  callToken,
  startConsultation,
  completeConsultation,
  markNotResponded,
  recallToken,
  getQueueEvents,
} = require("../controllers/queueController");

const {
  predictDuration,
  predictDurationV3,
} = require("../controllers/predictionController");

const router = express.Router();

// Get current queue
router.get("/", getQueue);

router.get("/events", getQueueEvents);

// ML consultation duration prediction
router.post("/predict-consultation-duration", predictDuration);

router.post(
  "/predict-consultation-duration-v3",
  predictDurationV3
);

// Call a patient
router.put("/:tokenId/call", callToken);

// Start consultation
router.put("/:tokenId/start", startConsultation);

// Complete consultation
router.put("/:tokenId/complete", completeConsultation);

// Mark patient as not responded
router.put("/:tokenId/not-responded", markNotResponded);

// Recall a previously not-responded patient
router.put("/:tokenId/recall", recallToken);

module.exports = router;
