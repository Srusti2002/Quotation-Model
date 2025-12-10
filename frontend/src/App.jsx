// App.jsx
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { ConfigProvider } from "antd";
import {
  HomeOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

// ALL YOUR PAGES — CORRECT FILENAMES!
import QuotationsPage from "./pages/QuotationsPage";
import ItemsPage from "./pages/ItemsPage";
import ChargesPage from "./pages/ChargesPage";
import Addquotation from "./pages/Addquotation";
import "./App.css";
import Quotation from "./pages/quotation";

// -----------------------
// Sidebar Component
// -----------------------
const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { title: "Quotations Columns", icon: HomeOutlined, path: "/quotations" },
    { title: "Charges", icon: FileTextOutlined, path: "/charges" },
    { title: "Items Columns", icon: ShoppingCartOutlined, path: "/items" },
    { title: "Add Quotation", icon: PlusOutlined, path: "/quotations/new" },
    { title: "Quotation", icon: PlusOutlined, path: "/new" },
  ];

  return (
    <div
      style={{
        width: collapsed ? "80px" : "250px",
        backgroundColor: "#001529",
        color: "#fff",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "width 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {!collapsed && <h3 style={{ margin: 0, color: "#fff" }}>Quotation</h3>}
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
      </div>

      {/* Menu Items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <div
              key={index}
              onClick={() => navigate(item.path)}
              style={{
                padding: "12px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: isActive ? "rgba(24, 144, 255, 0.2)" : "transparent",
                borderLeft: isActive ? "3px solid #1890ff" : "3px solid transparent",
                transition: "all 0.3s",
              }}
            >
              <Icon style={{ fontSize: "18px" }} />
              {!collapsed && <span>{item.title}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -----------------------
// Layout Component
// -----------------------
const Layout = ({ collapsed, onToggle, children }) => {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar collapsed={collapsed} onToggle={onToggle} />
      <div
        style={{
          marginLeft: collapsed ? "80px" : "250px",
          flex: 1,
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
          transition: "margin-left 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// -----------------------
// Home Page
// -----------------------
const HomePage = () => (
  <div style={{ padding: "40px", textAlign: "center" }}>
    <h1>Welcome to Quotation System</h1>
    <p>Use the sidebar to navigate.</p>
  </div>
);

// -----------------------
// Main App
// -----------------------
export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ConfigProvider>
      <Router>
        <Layout
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/charges" element={<ChargesPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/quotations/new" element={<Addquotation />} />
            <Route path="/new" element={<Quotation />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}