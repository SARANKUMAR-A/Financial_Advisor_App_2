import { NavLink, Outlet, useNavigate } from "react-router-dom";

function MainLayout() {

    const navigate = useNavigate();

    return (
        <div className="main-layout">

            <aside className="sidebar">

                <div className="sidebar-logo">

                    <div className="logo-icon">
                        ₹
                    </div>

                    <div>
                        <strong>Fin AI</strong>
                        <small>
                            Financial Intelligence
                        </small>
                    </div>

                </div>

                <div className="sidebar-section">

                    <p>WORKSPACE</p>

                    <NavLink
                        to="/dashboard"
                        className="sidebar-link"
                    >
                        <span>▦</span>
                        Dashboard
                    </NavLink>

                    <NavLink
                        to="/financial-data"
                        className="sidebar-link"
                    >
                        <span>◫</span>
                        Financial Data
                    </NavLink>

                    <NavLink
                        to="/transactions"
                        className="sidebar-link"
                    >
                        <span>₹</span>
                        Transactions
                    </NavLink>

                    <NavLink
                        to="/reports"
                        className="sidebar-link"
                    >
                        <span>▤</span>
                        Reports
                    </NavLink>

                </div>

                <div className="sidebar-section">

                    <p>ACCOUNT</p>

                    <NavLink
                        to="/profile"
                        className="sidebar-link"
                    >
                        <span>◯</span>
                        Profile
                    </NavLink>

                    <NavLink
                        to="/settings"
                        className="sidebar-link"
                    >
                        <span>⚙</span>
                        Settings
                    </NavLink>

                </div>

                <div className="sidebar-bottom">

                    <div className="support-box">

                        <strong>Need help?</strong>

                        <p>
                            Our support team is here for you.
                        </p>

                        <button>
                            Contact Support
                        </button>

                    </div>

                    <button
                        className="logout-button"
                        onClick={() => navigate("/login")}
                    >
                        ↪ Sign out
                    </button>

                </div>

            </aside>

            <main className="application-content">

                <header className="top-header">

                    <div>
                        <span>Fin AI</span>
                        <b>/</b>
                        <strong>Workspace</strong>
                    </div>

                    <div className="header-actions">

                        <button>⌕</button>

                        <button>♧</button>

                        <button
                            className="user-button"
                            onClick={() =>
                                navigate("/profile")
                            }
                        >
                            <span className="avatar">
                                SA
                            </span>

                            Sarankumar

                            <span>⌄</span>

                        </button>

                    </div>

                </header>

                <section className="content-area">
                    <Outlet />
                </section>

            </main>

        </div>
    );
}

export default MainLayout;