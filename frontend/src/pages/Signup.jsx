import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";

function Signup() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        confirm_password: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // Handle input changes
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // Handle signup
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await API.post(
                "signup/",
                formData
            );

            setSuccess(
                response.data.message || "Account created successfully!"
            );

            // Redirect to login after successful signup
            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {
            if (error.response?.data) {
                const data = error.response.data;

                const messages = Object.values(data)
                    .flat()
                    .join(" ");

                setError(messages);
            } else {
                setError("Unable to create account.");
            }

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-form-container">

            <div className="login-heading">

                <h2>Create Account</h2>

                <p>
                    Create your Fin AI account.
                </p>

            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="success-message">
                    {success}
                </div>
            )}

            <form
                className="login-form"
                onSubmit={handleSubmit}
            >

                <label>Full Name</label>

                <input
                    type="text"
                    name="first_name"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                />

                <label>Last Name</label>

                <input
                    type="text"
                    name="last_name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                />

                <label>Username</label>

                <input
                    type="text"
                    name="username"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={handleChange}
                    required
                />

                <label>Email</label>

                <input
                    type="email"
                    name="email"
                    placeholder="johndoe@work.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <label>Password</label>

                <input
                    type="password"
                    name="password"
                    placeholder="********"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <label>Confirm Password</label>

                <input
                    type="password"
                    name="confirm_password"
                    placeholder="********"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required
                />

                <label className="checkbox-label">

                    <input
                        type="checkbox"
                        required
                    />

                    <span className="checkbox-text">
                        I agree to the Terms of Use and Privacy Policy.
                    </span>

                </label>

                <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                >
                    {loading
                        ? "Creating Account..."
                        : "Create Account"}
                </button>

            </form>

            <p className="signup-text">

                Already registered?{" "}

                <Link to="/login">
                    Sign In
                </Link>

            </p>

        </div>
    );
}

export default Signup;