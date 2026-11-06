const Token = require("../models/Token");
const Doctor = require("../models/Doctor");
const QueueEvent = require("../models/QueueEvent");

// ======================================================
// GET CURRENT QUEUE
// ======================================================

const getQueue = async (req, res) => {
  try {
    const queue = await Token.find({
      status: {
        $in: ["WAITING", "CALLED", "START"],
      },
    })
      .populate("patient")
      .populate("doctor");

    // Explicit queue priority:
    // EMERGENCY patients first, then NORMAL patients.
    // Within the same priority, lower token number comes first.
    queue.sort((a, b) => {
      const priorityOrder = {
        EMERGENCY: 0,
        NORMAL: 1,
      };

      const priorityDifference =
        priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return a.tokenNumber - b.tokenNumber;
    });

    res.status(200).json({
      success: true,
      count: queue.length,
      queue,
    });
  } catch (error) {
    console.error("GET QUEUE ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch queue",
      error: error.message,
    });
  }
};



// ======================================================
// CALL TOKEN
// ======================================================

const callToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { doctorId } = req.body || {};

    const token = await Token.findById(tokenId);

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    // Token must be WAITING
    if (token.status !== "WAITING") {
      return res.status(400).json({
        success: false,
        message: `Token cannot be called because its current status is ${token.status}`,
      });
    }

    // ==================================================
    // ASSIGN DOCTOR
    // ==================================================

    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);

      // Doctor must exist
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      // Doctor assignment rules
// NORMAL token -> doctor must be Available
// EMERGENCY token -> doctor can be Available or Emergency

if (
  token.priority === "NORMAL" &&
  doctor.status !== "Available"
) {
  return res.status(400).json({
    success: false,
    message: `Normal token cannot be assigned because doctor status is ${doctor.status}`,
  });
}

if (
  token.priority === "EMERGENCY" &&
  doctor.status !== "Available" &&
  doctor.status !== "Emergency"
) {
  return res.status(400).json({
    success: false,
    message: `Emergency token cannot be assigned because doctor status is ${doctor.status}`,
  });
}

      token.doctor = doctorId;
    }

    // ==================================================
    // CHANGE TOKEN STATUS
    // ==================================================

    token.status = "CALLED";

    await token.save();

    // ==================================================
    // SOCKET.IO UPDATE
    // ==================================================

    const io = req.app.get("io");

    if (io) {
      io.emit("queueUpdated");
    }

    // ==================================================
    // CREATE QUEUE EVENT
    // ==================================================

    await QueueEvent.create({
      token: token._id,
      eventType: "TOKEN_CALLED",
      description: `Token ${token.tokenNumber} was called`,
    });

    // ==================================================
    // GET UPDATED TOKEN
    // ==================================================

    const updatedToken = await Token.findById(token._id)
      .populate("patient")
      .populate("doctor");

    res.status(200).json({
      success: true,
      message: "Token called successfully",
      token: updatedToken,
    });
  } catch (error) {
    console.error("CALL TOKEN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to call token",
      error: error.message,
    });
  }
};

// ======================================================
// START CONSULTATION
// ======================================================

const startConsultation = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findById(tokenId);

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    // Token must be CALLED
    if (token.status !== "CALLED") {
      return res.status(400).json({
        success: false,
        message: `Consultation cannot start because token status is ${token.status}`,
      });
    }

    token.status = "START";
    token.consultationStartTime = new Date();

    await token.save();

    // ==================================================
    // SOCKET.IO UPDATE
    // ==================================================

    const io = req.app.get("io");

    if (io) {
      io.emit("queueUpdated");
    }

    // ==================================================
    // CREATE QUEUE EVENT
    // ==================================================

    await QueueEvent.create({
      token: token._id,
      eventType: "CONSULTATION_STARTED",
      description: `Consultation started for token ${token.tokenNumber}`,
    });

    // ==================================================
    // GET UPDATED TOKEN
    // ==================================================

    const updatedToken = await Token.findById(token._id)
      .populate("patient")
      .populate("doctor");

    res.status(200).json({
      success: true,
      message: "Consultation started successfully",
      token: updatedToken,
    });
  } catch (error) {
    console.error("START CONSULTATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to start consultation",
      error: error.message,
    });
  }
};

// ======================================================
// COMPLETE CONSULTATION
// ======================================================

const completeConsultation = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findById(tokenId);

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    // Token must be START
    if (token.status !== "START") {
      return res.status(400).json({
        success: false,
        message: `Consultation cannot be completed because token status is ${token.status}`,
      });
    }

    token.status = "COMPLETED";
    token.consultationEndTime = new Date();

    await token.save();

    // ==================================================
    // SOCKET.IO UPDATE
    // ==================================================

    const io = req.app.get("io");

    if (io) {
      io.emit("queueUpdated");
    }

    // ==================================================
    // CREATE QUEUE EVENT
    // ==================================================

    await QueueEvent.create({
      token: token._id,
      eventType: "CONSULTATION_COMPLETED",
      description: `Consultation completed for token ${token.tokenNumber}`,
    });

    // ==================================================
    // GET UPDATED TOKEN
    // ==================================================

    const updatedToken = await Token.findById(token._id)
      .populate("patient")
      .populate("doctor");

    res.status(200).json({
      success: true,
      message: "Consultation completed successfully",
      token: updatedToken,
    });
  } catch (error) {
    console.error("COMPLETE CONSULTATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to complete consultation",
      error: error.message,
    });
  }
};

// ======================================================
// MARK TOKEN AS NOT RESPONDED
// ======================================================

const markNotResponded = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findById(tokenId);

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    // Token must be CALLED
    if (token.status !== "CALLED") {
      return res.status(400).json({
        success: false,
        message: `Token cannot be marked as NOT_RESPONDED because its current status is ${token.status}`,
      });
    }

    token.status = "NOT_RESPONDED";

    await token.save();

    // ==================================================
    // SOCKET.IO UPDATE
    // ==================================================

    const io = req.app.get("io");

    if (io) {
      io.emit("queueUpdated");
    }

    // ==================================================
    // CREATE QUEUE EVENT
    // ==================================================

    await QueueEvent.create({
      token: token._id,
      eventType: "NOT_RESPONDED",
      description: `Token ${token.tokenNumber} did not respond when called`,
    });

    // ==================================================
    // GET UPDATED TOKEN
    // ==================================================

    const updatedToken = await Token.findById(token._id)
      .populate("patient")
      .populate("doctor");

    res.status(200).json({
      success: true,
      message: "Token marked as NOT_RESPONDED",
      token: updatedToken,
    });
  } catch (error) {
    console.error("NOT RESPONDED ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark token as NOT_RESPONDED",
      error: error.message,
    });
  }
};

// ======================================================
// RECALL TOKEN
// ======================================================

const recallToken = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findById(tokenId);

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token not found",
      });
    }

    // Token must be NOT_RESPONDED
    if (token.status !== "NOT_RESPONDED") {
      return res.status(400).json({
        success: false,
        message: `Token cannot be recalled because its status is ${token.status}`,
      });
    }

    token.status = "CALLED";

    await token.save();

    // ==================================================
    // SOCKET.IO UPDATE
    // ==================================================

    const io = req.app.get("io");

    if (io) {
      io.emit("queueUpdated");
    }

    // ==================================================
    // CREATE QUEUE EVENT
    // ==================================================

    await QueueEvent.create({
      token: token._id,
      eventType: "TOKEN_RECALLED",
      description: `Token ${token.tokenNumber} was recalled`,
    });

    // ==================================================
    // GET UPDATED TOKEN
    // ==================================================

    const updatedToken = await Token.findById(token._id)
      .populate("patient")
      .populate("doctor");

    res.status(200).json({
      success: true,
      message: "Token recalled successfully",
      token: updatedToken,
    });
  } catch (error) {
    console.error("RECALL TOKEN ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to recall token",
      error: error.message,
    });
  }
};

// ======================================================
// GET QUEUE EVENTS / HISTORY
// ======================================================

const getQueueEvents = async (req, res) => {
  try {
    const events = await QueueEvent.find()
      .populate({
        path: "token",
        populate: [
          {
            path: "patient",
          },
          {
            path: "doctor",
          },
        ],
      })
      .sort({
        createdAt: 1,
      });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("GET QUEUE EVENTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch queue events",
      error: error.message,
    });
  }
};

// ======================================================
// EXPORT CONTROLLERS
// ======================================================

module.exports = {
  getQueue,
  callToken,
  startConsultation,
  completeConsultation,
  markNotResponded,
  recallToken,
  getQueueEvents,
};

