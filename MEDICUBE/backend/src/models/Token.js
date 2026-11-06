const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: Number,
      required: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "WAITING",
        "CALLED",
        "START",
        "NOT_RESPONDED",
        "COMPLETED",
      ],
      default: "WAITING",
    },

    priority: {
      type: String,
      enum: ["NORMAL", "EMERGENCY"],
      default: "NORMAL",
    },

    consultationStartTime: {
      type: Date,
      default: null,
    },

    consultationEndTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Token", tokenSchema);