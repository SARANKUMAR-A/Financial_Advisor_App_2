import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

function ForgotPassword() {

  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  const handleSubmit = async (e) => {

    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {

      const response = await API.post(
        "forgot-password/",
        {
          email,
        }
      );

      setMessage(
        response.data.message
      );

    } catch (error) {

      setError(
        error.response?.data?.message ||
        "Unable to process request."
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="auth-form-container">

      <h2>Forgot Password?</h2>

      <p>
        Enter your email address and we'll
        send you a password reset link.
      </p>


      {message && (
        <div className="success-message">
          {message}
        </div>
      )}


      {error && (
        <div className="error-message">
          {error}
        </div>
      )}


      <form onSubmit={handleSubmit}>

        <label>
          Email Address
        </label>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />


        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Sending..."
            : "Send Reset Link"}
        </button>

      </form>


      <p>
        Remember your password?{" "}

        <span
          className="auth-link"
          onClick={() =>
            navigate("/login")
          }
        >
          Login
        </span>
      </p>

    </div>
  );
}

export default ForgotPassword;