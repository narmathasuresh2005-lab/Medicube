import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const API_URL = "http://localhost:5000";

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await axios.get(
        `${API_URL}/api/analytics`
      );

      if (response.data.success) {
        setAnalytics(response.data.analytics);
        setError("");
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);

      setError(
        "Unable to load analytics data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const formatWaitingTime = (minutes) => {
    if (!minutes || minutes <= 0) {
      return "0 min";
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(
      minutes % 60
    );

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${remainingMinutes} min`;
  };

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
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>
            !
          </div>

          <h2 style={styles.errorTitle}>
            Unable to Load Analytics
          </h2>

          <p style={styles.errorText}>
            {error}
          </p>

          <button
            onClick={() => fetchAnalytics(true)}
            style={styles.retryButton}
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  const priorityData = [
    {
      name: "Normal",
      value: analytics?.normalTokens || 0,
    },
    {
      name: "Emergency",
      value: analytics?.emergencyTokens || 0,
    },
  ];

  const performanceData = [
    {
      name: "Total Tokens",
      value: analytics?.totalTokens || 0,
    },
    {
      name: "Completed",
      value: analytics?.completedCount || 0,
    },
  ];

  return (
    <div style={styles.page}>
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
                ANALYTICS DASHBOARD
              </p>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.liveBadge}>
              <span style={styles.liveDot}></span>
              LIVE DATA
            </div>

            <button
              onClick={() =>
                fetchAnalytics(true)
              }
              style={{
                ...styles.refreshButton,
                ...(refreshing
                  ? styles.refreshingButton
                  : {}),
              }}
              disabled={refreshing}
            >
              {refreshing
                ? "REFRESHING..."
                : "REFRESH DATA"}
            </button>
          </div>
        </header>

        {/* Overview */}
        <section style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <h2 style={styles.sectionTitle}>
                Overview
              </h2>

              <p style={styles.sectionSubtitle}>
                Current clinic queue performance
              </p>
            </div>
          </div>

          <div style={styles.statsGrid}>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                #
              </div>

              <div>
                <p style={styles.statLabel}>
                  TOTAL TOKENS
                </p>

                <h3 style={styles.statValue}>
                  {analytics?.totalTokens || 0}
                </h3>

                <p style={styles.statDescription}>
                  Tokens generated
                </p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                ✓
              </div>

              <div>
                <p style={styles.statLabel}>
                  COMPLETED
                </p>

                <h3 style={styles.statValue}>
                  {analytics?.completedCount || 0}
                </h3>

                <p style={styles.statDescription}>
                  Consultations completed
                </p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                ⏱
              </div>

              <div>
                <p style={styles.statLabel}>
                  AVG WAITING
                </p>

                <h3 style={styles.statValue}>
                  {formatWaitingTime(
                    analytics?.averageWaitingTime
                  )}
                </h3>

                <p style={styles.statDescription}>
                  Average patient waiting
                </p>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                ◷
              </div>

              <div>
                <p style={styles.statLabel}>
                  AVG CONSULTATION
                </p>

                <h3 style={styles.statValue}>
                  {(
                    analytics
                      ?.averageConsultationDuration ||
                    0
                  ).toFixed(1)}{" "}
                  min
                </h3>

                <p style={styles.statDescription}>
                  Average consultation time
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Charts */}
        <section style={styles.chartsGrid}>

          {/* Priority Chart */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h2 style={styles.chartTitle}>
                  Priority Distribution
                </h2>

                <p style={styles.chartSubtitle}>
                  Normal vs emergency patients
                </p>
              </div>
            </div>

            <div style={styles.chartArea}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={priorityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    outerRadius={105}
                    innerRadius={62}
                    paddingAngle={3}
                  >
                    {priorityData.map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={35}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Chart */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <div>
                <h2 style={styles.chartTitle}>
                  Queue Performance
                </h2>

                <p style={styles.chartSubtitle}>
                  Overall token activity
                </p>
              </div>
            </div>

            <div style={styles.chartArea}>
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={performanceData}
                  margin={{
                    top: 15,
                    right: 15,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="value"
                    radius={[8, 8, 0, 0]}
                    barSize={55}
                  >
                    {performanceData.map(
                      (entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>

        {/* Priority Summary */}
        <section style={styles.summaryCard}>
          <div>
            <p style={styles.summaryLabel}>
              PATIENT PRIORITY
            </p>

            <h2 style={styles.summaryTitle}>
              {analytics?.emergencyTokens || 0}{" "}
              emergency{" "}
              {analytics?.emergencyTokens === 1
                ? "patient"
                : "patients"}
            </h2>

            <p style={styles.summaryText}>
              {analytics?.normalTokens || 0} normal{" "}
              {analytics?.normalTokens === 1
                ? "patient"
                : "patients"}{" "}
              in the recorded queue data.
            </p>
          </div>

          
<div style={styles.summaryStats}>
  <div style={styles.summaryItem}>
    <span style={styles.summaryNumber}>
      {analytics?.normalTokens || 0}
    </span>

    <span style={styles.summarySmall}>
      NORMAL
    </span>
  </div>

  <div style={styles.summaryDivider}></div>

  <div style={styles.summaryItem}>
    <span
      style={{
        ...styles.summaryNumber,
        ...styles.emergencyNumber,
      }}
    >
      {analytics?.emergencyTokens || 0}
    </span>

    <span style={styles.summarySmall}>
      EMERGENCY
    </span>
  </div>
</div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <span style={styles.footerDot}></span>

          MediCube Smart Clinic Queue Management

          <span style={styles.footerDivider}>
            •
          </span>

          Analytics updates automatically every 30 seconds
        </footer>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef3f7 0%, #f8fafc 50%, #e8eef3 100%)",
    padding: "30px 25px",
    boxSizing: "border-box",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    maxWidth: "1180px",
    margin: "0 auto",
  },

  header: {
    backgroundColor: "#ffffff",
    padding: "22px 26px",
    borderRadius: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.08)",
    border: "1px solid #edf0f2",
  },

  brandSection: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
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
    fontSize: "27px",
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

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 13px",
    borderRadius: "20px",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    fontSize: "11px",
    fontWeight: "700",
  },

  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
  },

  refreshButton: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#222",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.3px",
  },

  refreshingButton: {
    opacity: 0.65,
    cursor: "default",
  },

  section: {
    marginTop: "32px",
  },

  sectionHeading: {
    marginBottom: "17px",
  },

  sectionTitle: {
    margin: "0",
    fontSize: "24px",
    fontWeight: "800",
    color: "#111827",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    fontSize: "13px",
    color: "#6b7280",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: "14px",
  },

  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: "15px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    border: "1px solid #edf0f2",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.06)",
  },

  statIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "11px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "800",
    flexShrink: 0,
  },

  statLabel: {
    margin: "0",
    fontSize: "9px",
    letterSpacing: "0.8px",
    fontWeight: "800",
    color: "#9ca3af",
  },

  statValue: {
    margin: "5px 0 0",
    fontSize: "24px",
    fontWeight: "800",
    color: "#111827",
  },

  statDescription: {
    margin: "4px 0 0",
    fontSize: "10px",
    color: "#9ca3af",
  },

  chartsGrid: {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "18px",
  },

  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    border: "1px solid #edf0f2",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.06)",
  },

  chartHeader: {
    marginBottom: "5px",
  },

  chartTitle: {
    margin: "0",
    fontSize: "17px",
    fontWeight: "800",
    color: "#111827",
  },

  chartSubtitle: {
    margin: "4px 0 0",
    fontSize: "11px",
    color: "#9ca3af",
  },

  chartArea: {
    width: "100%",
    height: "285px",
    marginTop: "5px",
  },

  summaryCard: {
    marginTop: "18px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "20px 24px",
    border: "1px solid #edf0f2",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    margin: "0",
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "1px",
    color: "#9ca3af",
  },

  summaryTitle: {
    margin: "5px 0 0",
    fontSize: "19px",
    fontWeight: "800",
    color: "#111827",
  },

  summaryText: {
    margin: "5px 0 0",
    fontSize: "12px",
    color: "#6b7280",
  },

  summaryStats: {
    display: "flex",
    alignItems: "center",
    gap: "22px",
  },

  summaryStats: {
    display: "flex",
    alignItems: "center",
    gap: "22px",
  },

  summaryNumber: {
    display: "block",
    textAlign: "center",
    fontSize: "24px",
    fontWeight: "800",
    color: "#374151",
  },

  emergencyNumber: {
    color: "#dc2626",
  },

  summarySmall: {
    display: "block",
    marginTop: "3px",
    fontSize: "8px",
    letterSpacing: "0.7px",
    fontWeight: "800",
    color: "#9ca3af",
  },

  summaryDivider: {
    width: "1px",
    height: "38px",
    backgroundColor: "#e5e7eb",
  },

  footer: {
    padding: "22px 10px 5px",
    textAlign: "center",
    fontSize: "11px",
    color: "#9ca3af",
  },

  footerDot: {
    display: "inline-block",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    marginRight: "7px",
  },

  footerDivider: {
    margin: "0 7px",
    color: "#d1d5db",
  },

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

  errorCard: {
    backgroundColor: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.09)",
    maxWidth: "400px",
  },

  errorIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
    fontSize: "20px",
    fontWeight: "800",
  },

  errorTitle: {
    margin: "0",
    fontSize: "20px",
    color: "#111827",
  },

  errorText: {
    margin: "8px 0 18px",
    fontSize: "13px",
    color: "#6b7280",
  },

  summaryItem: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "75px",
  gap: "7px",
},

  retryButton: {
    padding: "10px 18px",
    border: "none",
    borderRadius: "9px",
    backgroundColor: "#222",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "700",
  },
};

export default Analytics;