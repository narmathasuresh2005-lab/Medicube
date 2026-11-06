
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import "./NurseDashboard.css";

const API_URL = "http://localhost:5000";

function NurseDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingTokenId, setProcessingTokenId] = useState(null);
  const [connected, setConnected] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/queue`);
      setQueue(response.data.queue || []);
      setError("");
    } catch (err) {
      console.error("Queue fetch error:", err);
      setError("Unable to load queue. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const socket = io(API_URL);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleQueueUpdate = () => fetchQueue();

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleDisconnect);
    socket.on("queueUpdated", handleQueueUpdate);

    if (socket.connected) setConnected(true);

    fetchQueue();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleDisconnect);
      socket.off("queueUpdated", handleQueueUpdate);
      socket.disconnect();
    };
  }, [fetchQueue]);

  const handleAction = async (tokenId, action) => {
    const endpoints = {
      call: "call",
      start: "start",
      complete: "complete",
      "not-responded": "not-responded",
      recall: "recall",
    };

    const endpoint = endpoints[action];
    if (!endpoint || processingTokenId) return;

    setProcessingTokenId(tokenId);
    setError("");

    try {
      await axios.put(`${API_URL}/api/queue/${tokenId}/${endpoint}`);
      await fetchQueue();
    } catch (err) {
      console.error("Queue action error:", err);

      const message =
        err.response?.data?.message ||
        "Unable to perform queue action. Please try again.";

      await fetchQueue();
      setError(message);
    } finally {
      setProcessingTokenId(null);
    }

  };

  const renderActionButton = (token) => {
    const busy = processingTokenId === token._id;
    const disabled = Boolean(processingTokenId);

    const button = (label, action, className) => (
      <button
        type="button"
        className={`nurse-action ${className}`}
        disabled={disabled}
        onClick={() => handleAction(token._id, action)}
      >
        {busy ? "PLEASE WAIT..." : label}
      </button>
    );

    switch (token.status) {
      case "WAITING":
        return button("CALL", "call", "nurse-action-primary");

      case "CALLED":
        return (
          <div className="nurse-button-group">
            {button("START", "start", "nurse-action-primary")}
            {button("NO RESPONSE", "not-responded", "nurse-action-secondary")}
          </div>
        );

      case "START":
        return button("COMPLETE", "complete", "nurse-action-success");

      case "NOT_RESPONDED":
        return button("RECALL", "recall", "nurse-action-primary");

      default:
        return <span className="nurse-muted">No action available</span>;
    }
  };

  return (
    <main className="nurse-page">
      <div className="nurse-container">
        <header className="nurse-header">
          <div className="nurse-brand">
            <div className="nurse-logo" aria-hidden="true">M</div>
            <div>
              <h1>MEDICUBE</h1>
              <p>Nurse Dashboard</p>
            </div>
          </div>

          <div className="nurse-header-actions">
            <Link to="/analytics" className="nurse-analytics-link">
              Analytics
            </Link>

            <div
              className={`nurse-live ${connected ? "is-connected" : "is-disconnected"}`}
              role="status"
            >
              <span className="nurse-live-dot" />
              {connected ? "LIVE" : "OFFLINE"}
            </div>
          </div>
        </header>

        <section className="nurse-queue-heading">
          <div>
            <h2>Current Queue</h2>
            <p>Manage patients waiting for consultation</p>
          </div>

          <div className="nurse-queue-count" aria-live="polite">
            <strong>{queue.length}</strong>
            <span>{queue.length === 1 ? "patient" : "patients"}</span>
          </div>
        </section>

        {error && (
          <div className="nurse-error" role="alert">
            <strong>!</strong>
            <span>{error}</span>
            <button type="button" onClick={fetchQueue}>
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="nurse-message-card" role="status">
            <div className="nurse-spinner" />
            <p>Loading queue...</p>
          </div>
        )}

        {!loading && !error && queue.length === 0 && (
          <section className="nurse-empty">
            <div className="nurse-empty-icon">✓</div>
            <h3>Queue is clear</h3>
            <p>There are currently no patients in the active queue.</p>
          </section>
        )}

        {!loading && queue.length > 0 && (
          <section className="nurse-queue" aria-label="Patient queue">
            {queue.map((token, index) => (
              <article className="nurse-card" key={token._id}>
                <div className="nurse-position">#{index + 1}</div>

                <div className="nurse-patient">
                  <span className="nurse-token-number">
                    TOKEN {token.tokenNumber}
                  </span>
                  <span className="nurse-patient-name">
                    {token.patient?.name || "Unknown Patient"}
                  </span>
                </div>

                <div className="nurse-card-field">
                  <span className="nurse-field-label">STATUS</span>
                  <span className={`nurse-status status-${String(token.status).toLowerCase()}`}>
                    <span className="nurse-status-dot" />
                    {token.status.replace("_", " ")}
                  </span>
                </div>

                <div className="nurse-card-field">
                  <span className="nurse-field-label">PRIORITY</span>
                  <span
                    className={`nurse-priority ${
                      token.priority === "EMERGENCY" ? "priority-emergency" : ""
                    }`}
                  >
                    {token.priority || "NORMAL"}
                  </span>
                </div>

                <div className="nurse-card-action">
                  {renderActionButton(token)}
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="nurse-footer">
          MediCube · Smart Clinic Queue Management
        </footer>
      </div>
    </main>
  );
}

export default NurseDashboard;
