import { Outlet } from "react-router-dom";

function AuthLayout() {
    return (
        <div className="auth-page">

            {/* LEFT SIDE */}
            <div className="auth-left">

                <div className="auth-logo">
                    <div className="logo-icon">₹</div>
                    <span>Fin AI</span>
                </div>

                <div className="finance-illustration">

                    <div className="illustration-screen">
                        <div className="rupee-symbol">
                            ₹
                        </div>

                        <div className="mini-chart">
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>

                    <div className="person person-left"></div>

                    <div className="person person-right"></div>

                    <div className="money money-1">₹</div>
                    <div className="money money-2">₹</div>
                    <div className="money money-3">₹</div>

                </div>

                <div className="auth-left-content">

                    <p>
                        Get started for free & integrate in minutes
                    </p>

                    <h1>
                        Get Structured Financial Data
                    </h1>

                    <span>
                        Analyze, organize and understand your
                        financial data in one secure workspace.
                    </span>

                </div>

                <div className="dot-pattern"></div>

            </div>

            {/* RIGHT SIDE */}
            <div className="auth-right">

                <Outlet />

                <div className="auth-footer">
                    <span>All rights reserved.</span>

                    <div>
                        <span>Terms of Use</span>
                        <span>Privacy Policy</span>
                    </div>
                </div>

            </div>

        </div>
    );
}

export default AuthLayout;