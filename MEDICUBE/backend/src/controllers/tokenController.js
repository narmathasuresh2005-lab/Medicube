
const Token = require("../models/Token");
const Patient = require("../models/Patient");
const QueueEvent = require("../models/QueueEvent");

const {
  predictConsultationDuration,
  predictConsultationDurationV3,
} = require("../services/mlService");

// Generate a new token
const createToken = async (req, res) => {
  try {
    const { patientId, priority = "NORMAL" } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    if (!["NORMAL", "EMERGENCY"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Priority must be NORMAL or EMERGENCY",
      });
    }

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const latestToken = await Token.findOne()
      .sort({ tokenNumber: -1 })
      .select("tokenNumber");

    const tokenNumber = latestToken
      ? latestToken.tokenNumber + 1
      : 1;

    const token = await Token.create({
      patient: patient._id,
      tokenNumber,
      priority,
      status: "WAITING",
    });

    try {
      await QueueEvent.create({
        token: token._id,
        eventType: priority === "EMERGENCY" ? "EMERGENCY" : "TOKEN_CREATED",
        details: { priority },
      });
    } catch (eventError) {
      console.error("Queue event creation failed:", eventError.message);
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("queueUpdated");
    }

    return res.status(201).json({
      success: true,
      message: "Token created successfully",
      token,
    });
  } catch (error) {
    console.error("Create token error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create token",
      error: error.message,
    });
  }
};

// Get token status and predictions
const getTokenStatus = async (req, res) => {
  try {
    const parsedTokenNumber = Number(req.params.tokenNumber);

    if (
      !Number.isInteger(parsedTokenNumber) ||
      parsedTokenNumber < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid token number",
      });
    }

    const token = await Token.findOne({
      tokenNumber: parsedTokenNumber,
    }).populate("patient");

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    let waitingTime = null;
    let aiPrediction = null;
    let predictionError = null;
    let aiPredictionV3 = null;
    let predictionErrorV3 = null;
    let estimatedWaitingTime = null;
    let queuePosition = null;

    const activeStatuses = ["WAITING", "CALLED", "START"];

    if (activeStatuses.includes(token.status)) {
      const queue = await Token.find({
        status: { $in: activeStatuses },
      }).sort({ tokenNumber: 1 });

      // Emergency tokens go before normal tokens.
      queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority === "EMERGENCY" ? -1 : 1;
        }

        return a.tokenNumber - b.tokenNumber;
      });

      const targetIndex = queue.findIndex(
        (item) => item._id.toString() === token._id.toString()
      );

      if (targetIndex !== -1) {
        queuePosition = targetIndex + 1;

        // CALLED or START tokens are not waiting behind the queue.
        if (token.status === "CALLED" || token.status === "START") {
          estimatedWaitingTime = 0;
        } else {
          let totalEstimatedMinutes = 0;

          // Estimate the consultation time of every patient ahead.
          for (const ahead of queue.slice(0, targetIndex)) {
            let predictedDuration = 15.301;

            if (ahead.status === "START") {
              try {
                const elapsedWaiting = Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(ahead.createdAt).getTime()) /
                      60000
                  )
                );

                const result =
                  await predictConsultationDuration(elapsedWaiting);

                const value = Number(
                  result?.predictedConsultationDuration
                );

                if (Number.isFinite(value) && value > 0) {
                  predictedDuration = value;
                }
              } catch (error) {
                console.error(
                  "Prediction for active consultation failed:",
                  error.message
                );
              }

              const elapsedConsultation = ahead.consultationStartTime
                ? Math.max(
                    0,
                    (Date.now() -
                      new Date(ahead.consultationStartTime).getTime()) /
                      60000
                  )
                : 0;

              totalEstimatedMinutes += Math.max(
                0,
                predictedDuration - elapsedConsultation
              );
            } else {
              try {
                const elapsedWaiting = Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(ahead.createdAt).getTime()) /
                      60000
                  )
                );

                const result =
                  await predictConsultationDuration(elapsedWaiting);

                const value = Number(
                  result?.predictedConsultationDuration
                );

                if (Number.isFinite(value) && value > 0) {
                  predictedDuration = value;
                }
              } catch (error) {
                console.error(
                  "Queue prediction failed:",
                  error.message
                );
              }

              totalEstimatedMinutes += predictedDuration;
            }
          }

          estimatedWaitingTime = Math.ceil(totalEstimatedMinutes);
        }
      }
    }

    // Generate both predictions for waiting tokens.
    // The original model remains the existing kiosk prediction.
    if (token.status === "WAITING") {
      waitingTime = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(token.createdAt).getTime()) / 60000
        )
      );

      // Existing model — port 8000.
      try {
        aiPrediction =
          await predictConsultationDuration(waitingTime);
      } catch (error) {
        predictionError = error.message;
        console.error("Token AI prediction failed:", error.message);
      }

      // Experimental V3 candidate — port 8001.
      try {
        aiPredictionV3 = await predictConsultationDurationV3({
  waitingTime: Math.min(waitingTime, 240),
  priority: token.priority || "NORMAL",
  specialization: "General Medicine",
});
      } catch (error) {
        predictionErrorV3 = error.message;
        console.error("Token V3 prediction failed:", error.message);
      }
    }

    return res.status(200).json({
      success: true,
      token,
      waitingTime,
      aiPrediction,
      predictionError,
      aiPredictionV3,
      predictionErrorV3,
      queuePosition,
      estimatedWaitingTime,
    });
  } catch (error) {
    console.error("Get token status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get token status",
      error: error.message,
    });
  }
};

module.exports = {
  createToken,
  getTokenStatus,
};
