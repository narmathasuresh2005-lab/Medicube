import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "https://medicube.onrender.com";

function Hall() {
  const [currentToken, setCurrentToken] = useState(null);
  const [nextTokens, setNextTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/queue`);

      if (response.data.success) {
        const queue = response.data.queue || [];

        console.log(
          "WAITING HALL QUEUE:",
          queue.map(
            (token) =>
              `Token ${token.tokenNumber} = ${token.status}`
          )
        );

        // -----------------------------------------
        // 1. Find all tokens currently in consultation
        // -----------------------------------------
        const startedTokens = queue.filter(
          (token) => token.status === "START"
        );

        // -----------------------------------------
        // 2. Find all called tokens
        // -----------------------------------------
        const calledTokens = queue.filter(
          (token) => token.status === "CALLED"
        );

        // -----------------------------------------
        // 3. Select the active token
        // -----------------------------------------
        let activeToken = null;

        if (startedTokens.length > 0) {
          activeToken = [...startedTokens].sort(
            (a, b) => b.tokenNumber - a.tokenNumber
          )[0];
        } else if (calledTokens.length > 0) {
          activeToken = [...calledTokens].sort(
            (a, b) => a.tokenNumber - b.tokenNumber
          )[0];
        }

        // -----------------------------------------
        // 4. Find waiting tokens
        // -----------------------------------------
        const waitingTokens = queue
          .filter((token) => token.status === "WAITING")
          .sort(
            (a, b) => a.tokenNumber - b.tokenNumber
          )
          .slice(0, 5);

        console.log(
          "ACTIVE TOKEN:",
          activeToken
            ? `Token ${activeToken.tokenNumber} = ${activeToken.status}`
            : "NONE"
        );

        console.log(
          "WAITING TOKENS:",
          waitingTokens
        );

        setCurrentToken(activeToken);
        setNextTokens(waitingTokens);
      }
    } catch (error) {
      console.error(
        "Error fetching queue:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO real-time updates
  useEffect(() => {
    fetchQueue();

    const socket = io(API_URL);

    socket.on("connect", () => {
      console.log(
        "Waiting Hall connected to Socket.IO"
      );
    });

    socket.on("queueUpdated", () => {
      console.log("Queue updated");
      fetchQueue();
    });

    socket.on("disconnect", () => {
      console.log(
        "Waiting Hall disconnected from Socket.IO"
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Loading screen
  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingLogo}>
            M
          </div>

          <h1 style={styles.loadingTitle}>
            MEDICUBE
          </h1>

          <p style={styles.loadingText}>
            Loading Waiting Hall...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brandSection}>
          <div style={styles.logoCircle}>
            M
          </div>

          <div>
            <h1 style={styles.title}>
              MEDICUBE
            </h1>

            <p style={styles.subtitle}>
              WAITING HALL
            </p>
          </div>
        </div>

        <div style={styles.liveBadge}>
          <span style={styles.liveDot}></span>
          LIVE
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>

        {/* Current Token */}
        <section style={styles.currentSection}>

          <div style={styles.currentLabel}>
            <span style={styles.labelLine}></span>

            <p style={styles.nowServing}>
              NOW SERVING
            </p>

            <span style={styles.labelLine}></span>
          </div>

          {currentToken ? (
            <>
              <div style={styles.tokenDisplay}>
                <span style={styles.tokenPrefix}>
                  TOKEN
                </span>

                <span style={styles.currentToken}>
                  {currentToken.tokenNumber}
                </span>
              </div>

              {currentToken.status === "START" && (
                <div style={styles.consultationBox}>
                  <div style={styles.consultationIcon}>
                    ✓
                  </div>

                  <div>
                    <p style={styles.consultationTitle}>
                      CONSULTATION IN PROGRESS
                    </p>

                    <p style={styles.consultationText}>
                      Please wait while the consultation
                      is being completed.
                    </p>
                  </div>
                </div>
              )}

              {currentToken.status === "CALLED" && (
                <div style={styles.calledBox}>
                  <div style={styles.calledIcon}>
                    📢
                  </div>

                  <div>
                    <p style={styles.calledTitle}>
                      PLEASE PROCEED
                    </p>

                    <p style={styles.calledText}>
                      Please proceed to the consultation
                      room.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={styles.noActiveToken}>
              <div style={styles.waitingIcon}>
                —
              </div>

              <h2 style={styles.noTokenTitle}>
                NO ACTIVE TOKEN
              </h2>

              <p style={styles.noTokenText}>
                Please wait for the next token to be
                called.
              </p>
            </div>
          )}
        </section>

        {/* Next Tokens */}
        <section style={styles.nextSection}>

          <div style={styles.nextHeader}>
            <div>
              <h2 style={styles.nextTitle}>
                NEXT TOKENS
              </h2>

              <p style={styles.nextSubtitle}>
                Patients waiting for consultation
              </p>
            </div>

            <div style={styles.nextCount}>
              {nextTokens.length}
            </div>
          </div>

          {nextTokens.length > 0 ? (
            <div style={styles.nextContainer}>
              {nextTokens.map((token, index) => (
                <div
                  key={token._id}
                  style={styles.nextToken}
                >
                  <span style={styles.nextPosition}>
                    {index + 1}
                  </span>

                  <span style={styles.nextTokenText}>
                    TOKEN {token.tokenNumber}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noTokensCard}>
              <p style={styles.noTokens}>
                No patients waiting
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span style={styles.footerDot}></span>

        Please listen for your token number

        <span style={styles.footerDivider}>
          •
        </span>

        MediCube Smart Clinic Queue Management
      </footer>
    </div>
  );
}

const styles = {
  /* Main Page */
  container: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef3f7 0%, #f8fafc 50%, #e8eef3 100%)",
    display: "flex",
    flexDirection: "column",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    textAlign: "center",
    boxSizing: "border-box",
  },

  /* Header */
  header: {
    width: "100%",
    boxSizing: "border-box",
    padding: "22px 40px",
    backgroundColor: "#ffffff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom:
      "1px solid #e5e7eb",
    boxShadow:
      "0 4px 15px rgba(15, 23, 42, 0.05)",
  },

  brandSection: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    textAlign: "left",
  },

  logoCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    backgroundColor: "#222",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: "800",
  },

  title: {
    margin: "0",
    fontSize: "28px",
    fontWeight: "800",
    letterSpacing: "1px",
    color: "#111827",
  },

  subtitle: {
    margin: "3px 0 0",
    fontSize: "12px",
    letterSpacing: "2px",
    fontWeight: "600",
    color: "#6b7280",
  },

  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 13px",
    borderRadius: "20px",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    fontSize: "12px",
    fontWeight: "700",
  },

  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
  },

  /* Main */
  main: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
    padding: "35px 25px 20px",
    boxSizing: "border-box",
    flex: "1",
  },

  /* Current Token */
  currentSection: {
    backgroundColor: "#ffffff",
    borderRadius: "22px",
    padding: "42px 30px",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.09)",
    border:
      "1px solid #edf0f2",
  },

  currentLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
  },

  labelLine: {
    width: "45px",
    height: "2px",
    backgroundColor: "#d1d5db",
  },

  nowServing: {
    fontSize: "16px",
    fontWeight: "800",
    margin: "0",
    letterSpacing: "3px",
    color: "#6b7280",
  },

  tokenDisplay: {
    marginTop: "18px",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: "12px",
  },

  tokenPrefix: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: "1px",
  },

  currentToken: {
    fontSize: "96px",
    lineHeight: "1",
    margin: "0",
    fontWeight: "900",
    color: "#111827",
    letterSpacing: "2px",
  },

  /* Consultation State */
  consultationBox: {
    maxWidth: "600px",
    margin: "25px auto 0",
    padding: "16px 20px",
    borderRadius: "13px",
    backgroundColor: "#ecfdf5",
    border:
      "1px solid #d1fae5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "13px",
    textAlign: "left",
  },

  consultationIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "#10b981",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    flexShrink: 0,
  },

  consultationTitle: {
    margin: "0",
    fontSize: "14px",
    fontWeight: "800",
    color: "#047857",
  },

  consultationText: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "#6b7280",
  },

  /* Called State */
  calledBox: {
    maxWidth: "600px",
    margin: "25px auto 0",
    padding: "16px 20px",
    borderRadius: "13px",
    backgroundColor: "#eff6ff",
    border:
      "1px solid #dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "13px",
    textAlign: "left",
  },

  calledIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    flexShrink: 0,
  },

  calledTitle: {
    margin: "0",
    fontSize: "14px",
    fontWeight: "800",
    color: "#1d4ed8",
  },

  calledText: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "#6b7280",
  },

  /* No Active Token */
  noActiveToken: {
    padding: "25px 10px 5px",
  },

  waitingIcon: {
    width: "54px",
    height: "54px",
    margin: "0 auto 12px",
    borderRadius: "50%",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    fontWeight: "700",
  },

  noTokenTitle: {
    margin: "0",
    fontSize: "22px",
    color: "#374151",
  },

  noTokenText: {
    margin: "8px 0 0",
    fontSize: "14px",
    color: "#6b7280",
  },

  /* Next Tokens */
  nextSection: {
    marginTop: "25px",
  },

  nextHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "left",
    marginBottom: "13px",
  },

  nextTitle: {
    margin: "0",
    fontSize: "21px",
    fontWeight: "800",
    color: "#111827",
  },

  nextSubtitle: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "#6b7280",
  },

  nextCount: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "800",
    color: "#374151",
  },

  nextContainer: {
    display: "grid",
    gridTemplateColumns:
      "repeat(5, 1fr)",
    gap: "12px",
  },

  nextToken: {
    backgroundColor: "#ffffff",
    padding: "19px 10px",
    borderRadius: "13px",
    border:
      "1px solid #e5e7eb",
    boxShadow:
      "0 4px 12px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "7px",
  },

  nextPosition: {
    fontSize: "10px",
    color: "#9ca3af",
    fontWeight: "700",
  },

  nextTokenText: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#374151",
  },

  noTokensCard: {
    backgroundColor: "#ffffff",
    padding: "25px",
    borderRadius: "13px",
    border:
      "1px solid #e5e7eb",
  },

  noTokens: {
    margin: "0",
    fontSize: "14px",
    color: "#64748b",
  },

  /* Footer */
  footer: {
    padding: "18px 20px 22px",
    fontSize: "12px",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  footerDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
  },

  footerDivider: {
    color: "#d1d5db",
  },

  /* Loading */
  loadingPage: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef3f7 0%, #f8fafc 50%, #e8eef3 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  loadingCard: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.09)",
  },

  loadingLogo: {
    width: "50px",
    height: "50px",
    borderRadius: "14px",
    backgroundColor: "#222",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
    fontSize: "22px",
    fontWeight: "800",
  },

  loadingTitle: {
    margin: "0",
    fontSize: "24px",
    color: "#111827",
  },

  loadingText: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },
};

export default Hall;