
import { useState } from "react";
import axios from "axios";
import "./FrontDesk.css";

const API_URL = "http://localhost:5000";

export default function FrontDesk() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Female",
    priority: "NORMAL",
  });

  const [token, setToken] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setToken(null);

    try {
      const patientResponse = await axios.post(
        `${API_URL}/api/patients`,
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          age: Number(form.age),
          gender: form.gender,
        }
      );

      const patientId = patientResponse.data.patient?._id;

      if (!patientId) {
        throw new Error("Patient registration did not return an ID.");
      }

      const tokenResponse = await axios.post(
        `${API_URL}/api/tokens`,
        {
          patientId,
          priority: form.priority,
        }
      );

      if (!tokenResponse.data.token) {
        throw new Error("Token was not returned by the server.");
      }

      setPatientName(form.name.trim());
      setToken(tokenResponse.data.token);

      setForm({
        name: "",
        phone: "",
        age: "",
        gender: "Female",
        priority: "NORMAL",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to register patient."
      );
    } finally {
      setLoading(false);
    }
  };

  const registerAnother = () => {
    setToken(null);
    setPatientName("");
    setError("");
  };

  return (
    <div className="frontdesk-page">

      <div className="frontdesk-heading">
        <div>
          <span className="section-tag">PATIENT MANAGEMENT</span>
          <h1>Front Desk Registration</h1>
          <p>Register patients and generate queue tokens instantly.</p>
        </div>

        <div className="reception-status">
          <span className="status-indicator"></span>
          Reception Active
        </div>
      </div>

      <div className="frontdesk-grid">

        <div className="registration-card">
          <div className="card-heading">
            <div className="heading-icon">✚</div>
            <div>
              <h2>Register New Patient</h2>
              <p>Enter the patient's details below</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group full-width">
                <label>Patient Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter patient's full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Age</label>
                <input
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="Enter age"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

            </div>

            <div className="priority-section">
              <label>Patient Priority</label>

              <div className="priority-options">

                <button
                  type="button"
                  className={`priority-option normal ${
                    form.priority === "NORMAL" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setForm({ ...form, priority: "NORMAL" })
                  }
                >
                  <span className="priority-symbol">●</span>
                  <span>
                    <strong>Normal</strong>
                    <small>Regular consultation</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`priority-option emergency ${
                    form.priority === "EMERGENCY" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setForm({ ...form, priority: "EMERGENCY" })
                  }
                >
                  <span className="priority-symbol">✚</span>
                  <span>
                    <strong>Emergency</strong>
                    <small>Urgent medical attention</small>
                  </span>
                </button>

              </div>
            </div>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? "Registering Patient..." : "Register & Generate Token"}
              {!loading && <span>→</span>}
            </button>

            <p className="form-note">
              Patient details will be securely saved in the clinic database.
            </p>

          </form>
        </div>

        <div className="information-panel">
          <div className="info-icon">♥</div>
          <span className="info-tag">SMART CLINIC SYSTEM</span>
          <h2>Better Care Starts With Better Queues.</h2>
          <p>
            MediCube simplifies patient registration and helps
            clinics manage their consultation queues efficiently.
          </p>

          <div className="info-divider"></div>

          <div className="info-feature">
            <span>✓</span>
            Quick patient registration
          </div>
          <div className="info-feature">
            <span>✓</span>
            Automatic token generation
          </div>
          <div className="info-feature">
            <span>✓</span>
            Live queue updates
          </div>
          <div className="info-feature">
            <span>✓</span>
            AI-based waiting prediction
          </div>
        </div>

      </div>

      {token && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-check">✓</div>
            <span className="success-tag">REGISTRATION COMPLETE</span>
            <h2>Patient Registered Successfully!</h2>
            <p className="success-description">
              The patient's queue token has been generated.
            </p>

            <div className="token-display">
              <span>YOUR TOKEN NUMBER</span>
              <strong>#{token.tokenNumber}</strong>
              <span className="token-status">{token.status}</span>
            </div>

            <div className="token-details">
              <p><span>Patient</span><strong>{patientName}</strong></p>
              <p><span>Priority</span><strong>{token.priority}</strong></p>
            </div>

            <button
              className="register-button"
              onClick={registerAnother}
            >
              Register Another Patient →
            </button>

            <p className="success-note">
              Ask the patient to enter this token number at the Patient Kiosk.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
