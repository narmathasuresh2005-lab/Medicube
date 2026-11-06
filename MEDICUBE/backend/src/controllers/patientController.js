const Patient = require("../models/Patient");

// Create a new patient
const createPatient = async (req, res) => {
  try {
    const { name, phone, age, gender } = req.body;

    if (!name || !phone || age === undefined || !gender) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, age and gender are required",
      });
    }

    const patient = await Patient.create({
      name,
      phone,
      age,
      gender,
    });

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register patient",
      error: error.message,
    });
  }
};

// Get all patients
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch patients",
      error: error.message,
    });
  }
};

module.exports = {
  createPatient,
  getPatients,
};