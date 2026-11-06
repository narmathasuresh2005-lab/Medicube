const mongoose = require("mongoose");

const queueEventSchema = new mongoose.Schema(
  {
    token: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
      required: true,
    },

    eventType: {
      type: String,
      enum: [
        "TOKEN_CREATED",
        "TOKEN_CALLED",
        "CONSULTATION_STARTED",
        "CONSULTATION_COMPLETED",
        "NOT_RESPONDED",
        "TOKEN_RECALLED",
        "EMERGENCY",
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("QueueEvent", queueEventSchema);