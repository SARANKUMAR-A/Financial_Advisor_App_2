import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";

function Login() {
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // ==========================================
    // HANDLE INPUT CHANGE
    // ==========================================

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    // ==========================================
    // HANDLE LOGIN
    // ==========================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            console.log("Login request:", {
                username: formData.username,
            });

            // ==========================================
            // LOGIN API
            // ==========================================

            const response = await API.post(
                "login/",
                {
                    username: formData.username,
                    password: formData.password,
                }
            );

            console.log(
                "Login response:",
                response.data
            );

            const data = response.data;

            // ==========================================
            // VALIDATE ACCESS TOKEN
            // ==========================================

            if (!data?.access) {
                console.error(
                    "Access token missing:",
                    data
                );

                throw new Error(
                    "Login successful, but access token was not returned by the server."
                );
            }

            // ==========================================
            // CLEAR OLD SESSION
            // ==========================================

            sessionStorage.removeItem(
                "access_token"
            );

            sessionStorage.removeItem(
                "refresh_token"
            );

            sessionStorage.removeItem(
                "user"
            );

            sessionStorage.removeItem(
                "username"
            );

            // ==========================================
            // SAVE ACCESS TOKEN
            // ==========================================

            sessionStorage.setItem(
                "access_token",
                data.access
            );

            console.log(
                "New access token saved."
            );

            // ==========================================
            // SAVE REFRESH TOKEN
            // ==========================================

            if (data.refresh) {
                sessionStorage.setItem(
                    "refresh_token",
                    data.refresh
                );

                console.log(
                    "New refresh token saved."
                );
            } else {
                console.warn(
                    "Refresh token was not returned by the server."
                );
            }

            // ==========================================
            // SAVE USER DETAILS
            // ==========================================

            if (data.user) {
                sessionStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

                console.log(
                    "User details saved:",
                    data.user
                );
            }

            // ==========================================
            // SAVE USERNAME
            // ==========================================

            sessionStorage.setItem(
                "username",
                formData.username
            );

            // ==========================================
            // VERIFY SESSION
            // ==========================================

            console.log(
                "Session Access Token:",
                sessionStorage.getItem(
                    "access_token"
                )
            );

            console.log(
                "Session Refresh Token:",
                sessionStorage.getItem(
                    "refresh_token"
                )
            );

            // ==========================================
            // SUCCESS MESSAGE
            // ==========================================

            setSuccess(
                data.message ||
                "Login successful!"
            );

            // ==========================================
            // REDIRECT
            // ==========================================

            navigate(
                "/dashboard",
                {
                    replace: true,
                }
            );

        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            // ==========================================
            // AXIOS ERROR
            // ==========================================

            if (error.response?.data) {
                const responseData =
                    error.response.data;

                let errorMessage = "";

                if (
                    typeof responseData ===
                    "string"
                ) {
                    errorMessage =
                        responseData;
                } else if (
                    responseData.detail
                ) {
                    errorMessage =
                        responseData.detail;
                } else if (
                    responseData.message
                ) {
                    errorMessage =
                        responseData.message;
                } else {
                    errorMessage =
                        Object.values(
                            responseData
                        )
                            .flat()
                            .map((message) =>
                                typeof message ===
                                "string"
                                    ? message
                                    : JSON.stringify(
                                          message
                                      )
                            )
                            .join(" ");
                }

                setError(
                    errorMessage ||
                    "Invalid username or password."
                );

            } else {
                setError(
                    error.message ||
                    "Unable to login. Please try again."
                );
            }

        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // UI
    // ==========================================

    return (
        <div className="auth-form-container">

            {/* ======================================
                MOBILE LOGO
            ====================================== */}

            <div className="mobile-logo">

                <div className="logo-icon">
                    ₹
                </div>

                <span>
                    Fin AI
                </span>

            </div>

            {/* ======================================
                LOGIN HEADING
            ====================================== */}

            <div className="login-heading">

                <h2>
                    Welcome
                </h2>

                <p>
                    Sign into your account.
                </p>

            </div>

            {/* ======================================
                ERROR MESSAGE
            ====================================== */}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* ======================================
                SUCCESS MESSAGE
            ====================================== */}

            {success && (
                <div className="success-message">
                    {success}
                </div>
            )}

            {/* ======================================
                LOGIN FORM
            ====================================== */}

            <form
                className="login-form"
                onSubmit={handleSubmit}
            >

                {/* Username */}

                <label>
                    Username
                </label>

                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    autoComplete="username"
                    disabled={loading}
                    required
                />

                {/* Password */}

                <label>
                    Password
                </label>

                <div className="password-wrapper">

                    <input
                        type={
                            showPassword
                                ? "text"
                                : "password"
                        }
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="***********"
                        autoComplete="current-password"
                        disabled={loading}
                        required
                    />

                    <button
                        type="button"
                        onClick={() =>
                            setShowPassword(
                                (prev) => !prev
                            )
                        }
                        disabled={loading}
                    >
                        {showPassword
                            ? "Hide"
                            : "Show"}
                    </button>

                </div>

                {/* Forgot Password */}

                <div className="forgot-password">

                    <Link to="/forgot-password">
                        Forgot Password?
                    </Link>

                </div>

                {/* Submit */}

                <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                >
                    {loading
                        ? "Signing In..."
                        : "Submit"}
                </button>

            </form>

            {/* ======================================
                SOCIAL LOGIN DIVIDER
            ====================================== */}

            <div className="social-divider">

                <span></span>

                <p>
                    Or Signin with
                </p>

                <span></span>

            </div>

            {/* ======================================
                SOCIAL BUTTONS
            ====================================== */}

            <div className="social-buttons">

                <button type="button">
                    <b className="google">
                        G
                    </b>
                </button>

                <button type="button">
                    <b className="linkedin">
                        in
                    </b>
                </button>

                <button type="button">
                    <b className="github">
                        ●
                    </b>
                </button>

            </div>

            {/* ======================================
                SIGN UP
            ====================================== */}

            <p className="signup-text">

                Not registered yet?{" "}

                <Link to="/signup">
                    Sign Up Now
                </Link>

            </p>

        </div>
    );
}

export default Login;
