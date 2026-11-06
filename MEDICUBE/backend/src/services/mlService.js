const axios = require("axios");

// Existing ML service — keep the current model working
const ML_SERVICE_URL = "http://127.0.0.1:8000";

// Separate V3 candidate test service
const ML_V3_SERVICE_URL = "http://127.0.0.1:8001";

// Existing prediction function
const predictConsultationDuration = async (waitingTime) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      { waitingTime }
    );

    return response.data;
  } catch (error) {
    console.error(
      "ML prediction error:",
      error.response?.data || error.message
    );

    throw new Error("ML prediction service unavailable");
  }
};

// New V3 candidate prediction function
const predictConsultationDurationV3 = async ({
  waitingTime,
  priority,
  specialization,
}) => {
  try {
    const response = await axios.post(
      `${ML_V3_SERVICE_URL}/predict`,
      {
        waitingTime,
        priority,
        specialization,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "ML V3 prediction error:",
      error.response?.data || error.message
    );

    throw new Error("ML V3 test service unavailable");
  }
};

module.exports = {
  predictConsultationDuration,
  predictConsultationDurationV3,
};
