import React, { useEffect } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import FinancialData from "./pages/FinancialData";
import HistoryData from "./pages/HistoryData";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";

import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";


// ==========================================
// AUTH LAYOUT
// ==========================================

function AuthLayout({ children }) {
    return (
        <div className="auth-page">

            <div className="auth-image-section">

                <img
                    src="/Login_Image.jpg"
                    alt="Financial Application"
                    className="auth-image"
                />

            </div>


            <div className="auth-form-section">

                <div className="auth-form-wrapper">
                    {children}
                </div>

            </div>

        </div>
    );
}


// ==========================================
// SCROLL TO TOP ON ROUTE CHANGE
// ==========================================

function ScrollToTop() {
    const { pathname, search } = useLocation();

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
        });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }, [pathname, search]);

    return null;
}


// ==========================================
// APP
// ==========================================

function App() {

    return (
        <BrowserRouter>
            <ScrollToTop />

            <Routes>


                {/* ==================================
                    AUTHENTICATION PAGES
                ================================== */}

                <Route
                    path="/login"
                    element={
                        <AuthLayout>
                            <Login />
                        </AuthLayout>
                    }
                />


                <Route
                    path="/signup"
                    element={
                        <AuthLayout>
                            <Signup />
                        </AuthLayout>
                    }
                />


                <Route
                    path="/forgot-password"
                    element={
                        <AuthLayout>
                            <ForgotPassword />
                        </AuthLayout>
                    }
                />


                <Route
                    path="/reset-password"
                    element={
                        <AuthLayout>
                            <ResetPassword />
                        </AuthLayout>
                    }
                />


                {/* ==================================
                    PROTECTED APPLICATION ROUTES
                ================================== */}

                <Route element={<ProtectedRoute />}>


                    {/* Dashboard */}

                    <Route
                        path="/dashboard"
                        element={
                            <AppLayout>
                                <Dashboard />
                            </AppLayout>
                        }
                    />


                    {/* Financial Data */}

                    <Route
                        path="/financial-data"
                        element={
                            <AppLayout>
                                <FinancialData />
                            </AppLayout>
                        }
                    />


                    {/* Transactions */}

                    <Route
                        path="/transactions"
                        element={
                            <AppLayout>
                                <Transactions />
                            </AppLayout>
                        }
                    />


                    {/* History Data */}

                    <Route
                        path="/history-data"
                        element={
                            <AppLayout>
                                <HistoryData />
                            </AppLayout>
                        }
                    />

                    <Route
                        path="/history"
                        element={
                            <AppLayout>
                                <HistoryData />
                            </AppLayout>
                        }
                    />


                    {/* Reports */}

                    <Route
                        path="/reports"
                        element={
                            <AppLayout>
                                <Reports />
                            </AppLayout>
                        }
                    />


                    {/* Profile */}

                    <Route
                        path="/profile"
                        element={
                            <AppLayout>
                                <Profile />
                            </AppLayout>
                        }
                    />


                    {/* Settings */}

                    <Route
                        path="/settings"
                        element={
                            <AppLayout>
                                <Settings />
                            </AppLayout>
                        }
                    />

                </Route>


                {/* ==================================
                    DEFAULT ROUTE
                ================================== */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />


                {/* ==================================
                    UNKNOWN ROUTES
                ================================== */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}

export default App;