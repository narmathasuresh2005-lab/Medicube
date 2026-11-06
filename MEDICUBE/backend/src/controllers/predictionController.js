const {
  predictConsultationDuration,
  predictConsultationDurationV3,
} = require("../services/mlService");

// ================================================
// EXISTING MODEL — PORT 8000
// ================================================

const predictDuration = async (req, res) => {
  try {
    const { waitingTime } = req.body;

    if (
      waitingTime === undefined ||
      typeof waitingTime !== "number" ||
      !Number.isFinite(waitingTime) ||
      waitingTime < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid, non-negative waitingTime is required",
      });
    }

    const prediction =
      await predictConsultationDuration(waitingTime);

    return res.status(200).json(prediction);
  } catch (error) {
    console.error("Prediction controller error:", error.message);

    return res.status(503).json({
      success: false,
      message: "ML prediction service unavailable",
    });
  }
};

// ================================================
// V3 CANDIDATE — PORT 8001
// ================================================

const predictDurationV3 = async (req, res) => {
  try {
    const { waitingTime, priority, specialization } = req.body;

    if (
      typeof waitingTime !== "number" ||
      !Number.isFinite(waitingTime) ||
      waitingTime < 0 ||
      waitingTime > 240
    ) {
      return res.status(400).json({
        success: false,
        message: "waitingTime must be a number between 0 and 240",
      });
    }

    if (!["NORMAL", "EMERGENCY"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "priority must be NORMAL or EMERGENCY",
      });
    }

    const allowedSpecializations = [
      "General Medicine",
      "Pediatrics",
      "Cardiology",
    ];

    if (!allowedSpecializations.includes(specialization)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported doctor specialization",
      });
    }

    const prediction = await predictConsultationDurationV3({
      waitingTime,
      priority,
      specialization,
    });

    return res.status(200).json(prediction);
  } catch (error) {
    console.error("V3 prediction controller error:", error.message);

    return res.status(503).json({
      success: false,
      message: "ML V3 test service unavailable",
    });
  }
};

module.exports = {
  predictDuration,
  predictDurationV3,
};
