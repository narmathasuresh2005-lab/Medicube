const express = require("express");

const router = express.Router();

const {
  createPatient,
  getPatients,
} = require("../controllers/patientController");

// Create a new patient
router.post("/", createPatient);

// Get all patients
router.get("/", getPatients);

module.exports = router;