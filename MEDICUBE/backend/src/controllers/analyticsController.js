
const Token = require("../models/Token");

const MAX_WAITING_MINUTES = 240;
const MAX_CONSULTATION_MINUTES = 180;

const getAnalytics = async (req, res) => {
  try {
    const tokens = await Token.find();

    const totalTokens = tokens.length;

    const completedTokens = tokens.filter(
      (token) => token.status === "COMPLETED"
    );

    // Calculate waiting times
    const waitingTimes = completedTokens
      .map((token) => {
        if (!token.createdAt || !token.consultationStartTime) {
          return null;
        }

        const duration =
          (new Date(token.consultationStartTime) -
            new Date(token.createdAt)) /
          (1000 * 60);

        return Number.isFinite(duration) &&
          duration >= 0 &&
          duration <= MAX_WAITING_MINUTES
          ? duration
          : null;
      })
      .filter((value) => value !== null);

    // Calculate consultation durations
    const consultationDurations = completedTokens
      .map((token) => {
        if (
          !token.consultationStartTime ||
          !token.consultationEndTime
        ) {
          return null;
        }

        const duration =
          (new Date(token.consultationEndTime) -
            new Date(token.consultationStartTime)) /
          (1000 * 60);

        return Number.isFinite(duration) &&
          duration >= 0 &&
          duration <= MAX_CONSULTATION_MINUTES
          ? duration
          : null;
      })
      .filter((value) => value !== null);

    // Calculate averages
    const averageWaitingTime =
      waitingTimes.length > 0
        ? waitingTimes.reduce((sum, value) => sum + value, 0) /
          waitingTimes.length
        : 0;

    const averageConsultationDuration =
      consultationDurations.length > 0
        ? consultationDurations.reduce((sum, value) => sum + value, 0) /
          consultationDurations.length
        : 0;

    // Count priority tokens
    const emergencyTokens = tokens.filter(
      (token) => token.priority === "EMERGENCY"
    ).length;

    const normalTokens = tokens.filter(
      (token) => token.priority === "NORMAL"
    ).length;

    res.status(200).json({
      success: true,
      analytics: {
        totalTokens,
        completedCount: completedTokens.length,

        averageWaitingTime: Number(
          averageWaitingTime.toFixed(2)
        ),

        averageConsultationDuration: Number(
          averageConsultationDuration.toFixed(2)
        ),

        validWaitingRecords: waitingTimes.length,
        validConsultationRecords: consultationDurations.length,

        excludedWaitingRecords:
          completedTokens.length - waitingTimes.length,

        excludedConsultationRecords:
          completedTokens.length - consultationDurations.length,

        emergencyTokens,
        normalTokens,
      },
    });
  } catch (error) {
    console.error("GET ANALYTICS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};

module.exports = {
  getAnalytics,
};
