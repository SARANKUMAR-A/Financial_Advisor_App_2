import React, { useState } from "react";

import Sidebar from "../components/Sidebar";

import "../styles/layout.css";

function AppLayout({ children }) {

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`app-layout ${
        collapsed ? "sidebar-collapsed" : ""
      }`}
    >

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main className="main-content">
        {children}
      </main>

    </div>
  );
}

export default AppLayout;