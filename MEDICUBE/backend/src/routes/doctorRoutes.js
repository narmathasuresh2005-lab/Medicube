const express = require("express");

const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctorStatus,
} = require("../controllers/doctorController");

const router = express.Router();

// GET all doctors
router.get("/", getDoctors);

// GET doctor by ID
router.get("/:id", getDoctorById);

// POST create doctor
router.post("/", createDoctor);

// PUT update doctor status
router.put("/:id/status", updateDoctorStatus);

module.exports = router;

