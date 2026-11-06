const {
  predictConsultationDuration,
} = require("../services/mlService");

const predictDuration = async (req, res) => {
  try {
    const { waitingTime } = req.body;

    if (waitingTime === undefined) {
      return res.status(400).json({
        success: false,
        message: "waitingTime is required",
      });
    }

    if (typeof waitingTime !== "number" || waitingTime < 0) {
      return res.status(400).json({
        success: false,
        message: "waitingTime must be a non-negative number",
      });
    }

    const prediction = await predictConsultationDuration(
      waitingTime
    );

   res.status(200).json({
  ...prediction,

  confidence: "Low",

confidenceReason:
  "Confidence is low because the model was trained using a small historical dataset.",

  explanation:
    `Based on a current waiting time of ${waitingTime} minutes and patterns learned from previous completed consultations, the estimated consultation duration is ${prediction.predictedConsultationDuration} minutes.`,
});

  } catch (error) {
    console.error("ML controller error:", error);

    res.status(503).json({
      success: false,
      message: "ML prediction service unavailable",
    });
  }
};

module.exports = {
  predictDuration,
};