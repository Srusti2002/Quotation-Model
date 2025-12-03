import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ConfigProvider } from "antd";
import {
  FileTextOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  FileDoneOutlined,
  BarChartOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
} from "@ant-design/icons";

// -----------------------
// Sidebar Component
// -----------------------
const Sidebar = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { title: "Quotations", icon: HomeOutlined, path: "/" },
    { title: "Charges", icon: FileTextOutlined, path: "/quotations" },
    { title: "Items", icon: ShoppingCartOutlined, path: "/Items" },
    
    

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
        overflow: "hidden",
        transition: "width 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header with toggle */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {!collapsed && <h3 style={{ margin: 0 }}>Quotation</h3>}
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

      {/* Menu items */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <div
              key={index}
              onClick={() => navigate(item.path)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: isActive ? "rgba(24, 144, 255, 0.2)" : "transparent",
                borderLeft: isActive ? "3px solid #1890ff" : "3px solid transparent",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
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
// Menu Card Component
// -----------------------
const MenuCard = ({ title, icon: Icon, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "20px",
        borderRadius: "8px",
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        cursor: "pointer",
        textAlign: "center",
        transition: "0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: "24px", marginBottom: "10px" }}>
        <Icon style={{ color: "#1890ff" }} />
      </div>

      <div style={{ fontSize: "16px", fontWeight: "bold" }}>
        {title}
      </div>
    </div>
  );
};

// -----------------------
// Home Page Component
// -----------------------
const HomePage = () => {
  return (
    <div style={{ padding: "40px" }}>
      <h2>Welcome to Charges Table</h2>
      <p>Select an option from the sidebar to get started.</p>
    </div>
  );
};

// Import your ChargesPage here
import ChargesPage from "./pages/ChargesPage";

// Placeholder pages (replace with your actual pages)
const OrdersPage = () => <div style={{ padding: "40px" }}><h2>Orders Page</h2></div>;
const CustomersPage = () => <div style={{ padding: "40px" }}><h2>Customers Page</h2></div>;
const InvoicesPage = () => <div style={{ padding: "40px" }}><h2>Invoices Page</h2></div>;
const ReportsPage = () => <div style={{ padding: "40px" }}><h2>Reports Page</h2></div>;
const SettingsPage = () => <div style={{ padding: "40px" }}><h2>Settings Page</h2></div>;

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
          transition: "margin-left 0.3s ease",
          backgroundColor: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// -----------------------
// App Component
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
            <Route path="/quotations" element={<ChargesPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}