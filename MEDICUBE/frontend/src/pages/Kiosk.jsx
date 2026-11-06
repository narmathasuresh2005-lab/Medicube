  import { useCallback, useEffect, useState } from "react";
  import axios from "axios";
  import { io } from "socket.io-client";

  const API_URL = "https://medicube.onrender.com";
  const MAX_STALE_MINUTES = 8 * 60;

  const styles = {
    page: {
      minHeight: "100vh",
      padding: "32px 16px",
      boxSizing: "border-box",
      background: "linear-gradient(135deg, #eef5ff, #f5f3ff)",
      fontFamily: "Arial, sans-serif",
      color: "#172554",
    },
    container: { maxWidth: "760px", margin: "0 auto" },
    header: { textAlign: "center", marginBottom: "28px" },
    logo: {
      fontSize: "34px",
      fontWeight: "800",
      letterSpacing: "3px",
      color: "#1d4ed8",
      margin: "0 0 8px",
    },
    subtitle: { color: "#64748b", margin: 0 },
    card: {
      background: "#ffffff",
      borderRadius: "20px",
      padding: "28px",
      boxShadow: "0 12px 35px rgba(30, 64, 175, 0.10)",
      marginBottom: "20px",
    },
    label: { display: "block", fontWeight: "700", marginBottom: "10px" },
    inputRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
    input: {
      flex: "1",
      minWidth: "160px",
      padding: "13px 14px",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      fontSize: "16px",
      boxSizing: "border-box",
    },
    button: {
      padding: "13px 20px",
      border: "none",
      borderRadius: "10px",
      background: "#2563eb",
      color: "#ffffff",
      fontWeight: "700",
      fontSize: "15px",
      cursor: "pointer",
    },
    secondaryButton: {
      padding: "11px 18px",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      background: "#ffffff",
      color: "#334155",
      fontWeight: "700",
      cursor: "pointer",
    },
    error: {
      color: "#b91c1c",
      background: "#fef2f2",
      borderRadius: "10px",
      padding: "12px",
      marginTop: "16px",
    },
    tokenLabel: {
      color: "#64748b",
      fontSize: "13px",
      fontWeight: "700",
      letterSpacing: "1.5px",
      textAlign: "center",
    },
    tokenNumber: {
      color: "#1d4ed8",
      fontSize: "64px",
      fontWeight: "800",
      textAlign: "center",
      margin: "8px 0 18px",
    },
    patientName: {
      textAlign: "center",
      fontSize: "22px",
      fontWeight: "700",
      marginBottom: "18px",
      overflowWrap: "anywhere",
    },
    badges: {
      display: "flex",
      justifyContent: "center",
      gap: "10px",
      flexWrap: "wrap",
      marginBottom: "24px",
    },
    badge: {
      padding: "7px 13px",
      borderRadius: "20px",
      fontWeight: "700",
      fontSize: "12px",
    },
    divider: { height: "1px", background: "#e2e8f0", margin: "22px 0" },
    statusLabel: {
      textAlign: "center",
      fontSize: "12px",
      color: "#64748b",
      fontWeight: "700",
      letterSpacing: "1.5px",
    },
    status: {
      textAlign: "center",
      fontSize: "28px",
      fontWeight: "800",
      margin: "10px 0",
      overflowWrap: "anywhere",
    },
    message: { textAlign: "center", color: "#64748b", lineHeight: 1.6 },
    aiCard: {
      marginTop: "22px",
      padding: "20px",
      borderRadius: "14px",
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
    },
    aiTitle: { margin: "0 0 8px", color: "#1e40af", fontSize: "18px" },
    aiNumber: {
      fontSize: "30px",
      fontWeight: "800",
      color: "#1d4ed8",
      margin: "10px 0",
      overflowWrap: "anywhere",
    },
    smallText: { fontSize: "13px", lineHeight: 1.6, color: "#475569" },
    footer: {
      textAlign: "center",
      color: "#64748b",
      fontSize: "12px",
      marginTop: "24px",
    },
  };

  function getStatusInfo(status) {
    switch (status) {
      case "WAITING":
        return {
          color: "#b45309",
          message: "Please wait. Your token is in the queue.",
        };
      case "CALLED":
        return {
          color: "#1d4ed8",
          message: "Your token has been called. Please proceed as instructed.",
        };
      case "START":
        return {
          color: "#047857",
          message: "Your consultation is in progress.",
        };
      case "NOT_RESPONDED":
        return {
          color: "#b91c1c",
          message: "You missed your call. Please contact reception.",
        };
      case "COMPLETED":
        return {
          color: "#047857",
          message: "Your consultation is complete. Thank you!",
        };
      default:
        return {
          color: "#475569",
          message: "Please contact reception for assistance.",
        };
    }
  }

  function calculateServingTimeRange(waitMinutes) {
    const now = Date.now();
    const earliest = new Date(now + waitMinutes * 60_000);
    const latest = new Date(now + (waitMinutes + 20) * 60_000);

    const formatTime = (date) =>
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    return `${formatTime(earliest)} – ${formatTime(latest)}`;
  }

  function getQueueItems(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.queue)) return data.queue;
    if (Array.isArray(data?.tokens)) return data.tokens;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  export default function Kiosk() {
    const [tokenNumber, setTokenNumber] = useState("");
    const [tokenData, setTokenData] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [servingTimeRange, setServingTimeRange] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const checkTokenStatus = useCallback(async () => {
      const enteredToken = tokenNumber.trim();

      if (!enteredToken) {
        setError("Please enter your token number.");
        setTokenData(null);
        setPrediction(null);
        setServingTimeRange(null);
        return;
      }

      if (!/^\d+$/.test(enteredToken) || Number(enteredToken) < 1) {
        setError("Please enter a valid positive token number.");
        setTokenData(null);
        setPrediction(null);
        setServingTimeRange(null);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setPrediction(null);
        setServingTimeRange(null);

        const response = await axios.get(
          `${API_URL}/api/tokens/status/${enteredToken}`
        );

        const {
          token,
          aiPrediction,
          predictionError,
          aiPredictionV3,
          predictionErrorV3,
        } = response.data;

        if (!token) {
          throw new Error("Token details were not returned by the server.");
        }

        setTokenData(token);

        if (token.status !== "WAITING") return;

        // Don't display estimates for tokens left waiting from an old session.
        const createdAt = token.createdAt
          ? new Date(token.createdAt).getTime()
          : Date.now();

        const elapsedMinutes = (Date.now() - createdAt) / 60_000;

        if (elapsedMinutes > MAX_STALE_MINUTES) {
          setError(
            "This token is from an earlier session. Please confirm its status with reception."
          );
          return;
        }

        // Prefer V3 because it is currently working.
        // Fall back to the original prediction if V3 is unavailable.
        const selectedPrediction = aiPredictionV3?.success
          ? aiPredictionV3
          : aiPrediction?.success
            ? aiPrediction
            : null;

        if (selectedPrediction) {
          setPrediction(selectedPrediction);
        } else {
          console.error(
            "AI prediction unavailable:",
            predictionErrorV3 || predictionError
          );
        }

        // Estimate serving time using the selected prediction and active queue.
        try {
          const queueResponse = await axios.get(`${API_URL}/api/queue`);
          const queue = getQueueItems(queueResponse.data);

          const activeQueue = queue.filter((item) =>
            ["WAITING", "CALLED", "START"].includes(item.status)
          );

          const currentIndex = activeQueue.findIndex(
            (item) => String(item._id) === String(token._id)
          );

          if (currentIndex >= 0) {
            const duration = Number(
              selectedPrediction?.predictedConsultationDuration
            );

            if (Number.isFinite(duration) && duration > 0) {
              const patientsAhead = activeQueue
                .slice(0, currentIndex)
                .filter((item) => item.status !== "COMPLETED").length;

              // Rough estimate only. This assumes each patient ahead takes
              // approximately the same time as this token's prediction.
              const estimatedWaitMinutes = patientsAhead * duration;

              setServingTimeRange(
                calculateServingTimeRange(estimatedWaitMinutes)
              );
            }
          } else {
            console.warn(
              "Token was not found in the active queue; serving time unavailable."
            );
          }
        } catch (queueError) {
          console.error("Could not estimate serving time:", queueError);
        }
      } catch (err) {
        console.error("Token status error:", err);
        setTokenData(null);
        setPrediction(null);
        setServingTimeRange(null);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to connect to the MediCube server."
        );
      } finally {
        setLoading(false);
      }
    }, [tokenNumber]);

    useEffect(() => {
      const socket = io(API_URL);

      const handleQueueUpdate = () => {
        if (tokenNumber.trim()) {
          checkTokenStatus();
        }
      };

      socket.on("queueUpdated", handleQueueUpdate);

      return () => {
        socket.off("queueUpdated", handleQueueUpdate);
        socket.disconnect();
      };
    }, [tokenNumber, checkTokenStatus]);

    const resetKiosk = () => {
      setTokenNumber("");
      setTokenData(null);
      setPrediction(null);
      setServingTimeRange(null);
      setError("");
      setLoading(false);
    };

    const statusInfo = tokenData ? getStatusInfo(tokenData.status) : null;

    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.logo}>MEDICUBE</h1>
            <p style={styles.subtitle}>Patient Kiosk · Live Token Status</p>
          </header>

          <section style={styles.card}>
            <label htmlFor="tokenNumber" style={styles.label}>
              Enter your token number
            </label>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                checkTokenStatus();
              }}
              style={styles.inputRow}
            >
              <input
                id="tokenNumber"
                type="number"
                min="1"
                step="1"
                value={tokenNumber}
                onChange={(event) => setTokenNumber(event.target.value)}
                placeholder="e.g. 1"
                style={styles.input}
              />

              <button
                type="submit"
                style={styles.button}
                disabled={loading}
              >
                {loading ? "Checking..." : "Check Status"}
              </button>
            </form>

            {error && (
              <div role="alert" style={styles.error}>
                {error}
              </div>
            )}
          </section>

          {tokenData && (
            <section style={styles.card}>
              <p style={styles.tokenLabel}>YOUR TOKEN</p>
              <div style={styles.tokenNumber}>#{tokenData.tokenNumber}</div>

              <div style={styles.patientName}>
                {tokenData.patient?.name || "Patient"}
              </div>

              <div style={styles.badges}>
                <span
                  style={{
                    ...styles.badge,
                    color:
                      tokenData.priority === "EMERGENCY"
                        ? "#b91c1c"
                        : "#334155",
                    background:
                      tokenData.priority === "EMERGENCY"
                        ? "#fee2e2"
                        : "#f1f5f9",
                  }}
                >
                  {tokenData.priority || "NORMAL"} PRIORITY
                </span>

                <span
                  style={{
                    ...styles.badge,
                    color: "#475569",
                    background: "#e2e8f0",
                  }}
                >
                  LIVE STATUS
                </span>
              </div>

              <div style={styles.divider} />

              <p style={styles.statusLabel}>CURRENT STATUS</p>
              <div style={{ ...styles.status, color: statusInfo.color }}>
                {tokenData.status}
              </div>
              <p style={styles.message}>{statusInfo.message}</p>

              {tokenData.status === "WAITING" && (
                <div style={styles.aiCard}>
                  <h3 style={styles.aiTitle}>
                    AI Consultation Estimate (Experimental)
                  </h3>

                  <p style={styles.smallText}>
                    V3 experimental model · Synthetic training data only.
                    This prediction has not been clinically validated.
                  </p>

                  {prediction ? (
                    <>
                      <p style={styles.smallText}>
                        Estimated consultation duration
                      </p>

                      <div style={styles.aiNumber}>
                        {Number.isFinite(
                          Number(prediction.predictedConsultationDuration)
                        )
                          ? Number(
                              prediction.predictedConsultationDuration
                            ).toFixed(1)
                          : "Unavailable"}
                        {Number.isFinite(
                          Number(prediction.predictedConsultationDuration)
                        ) && " min"}
                      </div>

                      <div
                        style={{
                          marginTop: "20px",
                          padding: "16px",
                          background: "#ffffff",
                          borderRadius: "12px",
                        }}
                      >
                        <p style={styles.smallText}>
                          <strong>ESTIMATED SERVING TIME</strong>
                        </p>

                        {servingTimeRange ? (
                          <>
                            <div style={styles.aiNumber}>
                              {servingTimeRange}
                            </div>
                            <p style={styles.smallText}>
                              Approximate time you may be called, based on the
                              current queue. This can change as patients are
                              served or emergency cases arrive.
                            </p>
                          </>
                        ) : (
                          <p style={styles.smallText}>
                            Serving time is unavailable. Check again after
                            confirming that your token appears in the active
                            queue.
                          </p>
                        )}
                      </div>

                      <p style={styles.smallText}>
                        Consultation duration is not the same as remaining
                        waiting time. These estimates are not guarantees.
                      </p>
                    </>
                  ) : (
                    <p style={styles.smallText}>
                      The AI prediction is currently unavailable. Your token
                      status is still being tracked. Please try checking again.
                    </p>
                  )}
                </div>
              )}

              <div style={{ ...styles.divider, marginBottom: "18px" }} />

              <button
                type="button"
                onClick={resetKiosk}
                style={styles.secondaryButton}
              >
                Check Another Token
              </button>
            </section>
          )}

          <footer style={styles.footer}>
            MediCube · Smart Clinic Queue Management
          </footer>
        </div>
      </main>
    );
  }
