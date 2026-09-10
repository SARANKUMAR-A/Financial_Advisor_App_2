import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
    FiHome,
    FiDollarSign,
    FiCreditCard,
    FiBarChart2,
    FiUser,
    FiSettings,
    FiLogOut,
    FiChevronLeft,
    FiChevronRight,
} from "react-icons/fi";

import "../styles/sidebar.css";

function Sidebar({ collapsed, setCollapsed }) {
    const navigate = useNavigate();

    const menuItems = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: <FiHome />,
        },
        {
            name: "Financial Data",
            path: "/financial-data",
            icon: <FiDollarSign />,
        },
        {
            name: "Transactions",
            path: "/transactions",
            icon: <FiCreditCard />,
        },
        {
            name: "Reports",
            path: "/reports",
            icon: <FiBarChart2 />,
        },
        {
            name: "Profile",
            path: "/profile",
            icon: <FiUser />,
        },
        {
            name: "Settings",
            path: "/settings",
            icon: <FiSettings />,
        },
    ];

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");

        navigate("/login");
    };

    return (
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>

            {/* Logo / Brand */}
            <div className="sidebar-header">

                <div className="brand">

                    <div className="brand-icon">
                        $
                    </div>

                    {!collapsed && (
                        <span className="brand-name">
                            FinApp
                        </span>
                    )}

                </div>

                <button
                    className="collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={
                        collapsed
                            ? "Expand menu"
                            : "Collapse menu"
                    }
                >
                    {collapsed
                        ? <FiChevronRight />
                        : <FiChevronLeft />
                    }
                </button>

            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">

                <div className="menu-section">

                    {!collapsed && (
                        <p className="menu-title">
                            MENU
                        </p>
                    )}

                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `menu-item ${
                                    isActive ? "active" : ""
                                }`
                            }
                            title={
                                collapsed
                                    ? item.name
                                    : ""
                            }
                        >

                            <span className="menu-icon">
                                {item.icon}
                            </span>

                            {!collapsed && (
                                <span className="menu-text">
                                    {item.name}
                                </span>
                            )}

                        </NavLink>
                    ))}

                </div>

            </nav>

            {/* Bottom Section */}
            <div className="sidebar-bottom">

                <button
                    className="logout-btn"
                    onClick={handleLogout}
                    title={collapsed ? "Logout" : ""}
                >

                    <span className="menu-icon">
                        <FiLogOut />
                    </span>

                    {!collapsed && (
                        <span className="menu-text">
                            Logout
                        </span>
                    )}

                </button>

            </div>

        </aside>
    );
}

export default Sidebar;