const Doctor = require("../models/Doctor");

// Get all doctors
const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find();

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
      error: error.message,
    });
  }
};

// Get doctor by ID
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor",
      error: error.message,
    });
  }
};

// Create a doctor
const createDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.create(req.body);

    res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      data: doctor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create doctor",
      error: error.message,
    });
  }
};

// Update doctor status
const updateDoctorStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Available",
      "Busy",
      "Unavailable",
      "Emergency",
    ];

    // Check whether status was provided
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Doctor status is required",
      });
    }

    // Check whether status is valid
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor status",
        allowedStatuses,
      });
    }

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    doctor.status = status;

    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Doctor status updated successfully",
      data: doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update doctor status",
      error: error.message,
    });
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctorStatus,
};

