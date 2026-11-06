import { NavLink, Outlet } from "react-router-dom";
import "./SidebarLayout.css";

const navigation = [
  { name: "Front Desk", path: "/front-desk", icon: "＋" },
  { name: "Patient Kiosk", path: "/", icon: "▣" },
  { name: "Nurse Dashboard", path: "/nurse", icon: "✚" },
  { name: "Waiting Hall", path: "/waiting-hall", icon: "◷" },
  { name: "Analytics", path: "/analytics", icon: "▥" },
];

export default function SidebarLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">M</div>
          <div>
            <h2>MEDICUBE</h2>
            <span>SMART CLINIC SYSTEM</span>
          </div>
        </div>

        <p className="nav-heading">MAIN MENU</p>

        <nav className="navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="online-dot" />
          <span>System Online</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="topbar-label">MEDICUBE / CLINIC MANAGEMENT</span>
            <h3>Smart Patient Queue System</h3>
          </div>
          <div className="admin-profile">
            <div className="admin-avatar">A</div>
            <span>Admin</span>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

