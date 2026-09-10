import React, { useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import API from "../api/axios";


function ResetPassword() {

  const navigate = useNavigate();

  const { uid, token } = useParams();


  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
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


    if (password !== confirmPassword) {

      setError(
        "Passwords do not match."
      );

      return;
    }


    setLoading(true);


    try {

      const response = await API.post(
        "reset-password/",
        {
          uid,
          token,
          password,
          confirm_password: confirmPassword,
        }
      );


      setMessage(
        response.data.message
      );


      setTimeout(() => {
        navigate("/login");
      }, 2000);


    } catch (error) {

      if (error.response?.data) {

        const data =
          error.response.data;

        const message =
          Object.values(data)
            .flat()
            .join(" ");

        setError(message);

      } else {

        setError(
          "Unable to reset password."
        );

      }

    } finally {

      setLoading(false);

    }
  };


  return (
    <div className="auth-form-container">

      <h2>Reset Password</h2>

      <p>
        Create a new password for your account.
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
          New Password
        </label>

        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
        />


        <label>
          Confirm Password
        </label>

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
          required
        />


        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Resetting..."
            : "Reset Password"}
        </button>

      </form>

    </div>
  );
}

export default ResetPassword;