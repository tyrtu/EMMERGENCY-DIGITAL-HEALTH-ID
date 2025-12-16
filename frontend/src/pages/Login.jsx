// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearError, clearMessage } from "../store/authSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { Warning, CheckCircle, Info } from '@mui/icons-material';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { loading, error, isAuthenticated, user, role, message } = useSelector(
    (state) => state.auth
  );

  // Check for email confirmation success message from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('message') === 'email_confirmed_success') {
      // This will be handled by the message display
    }
  }, [location]);

  // Clear messages when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearMessage());
    };
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };


  // ✅ Redirect after login based on role
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "patient") {
        navigate("/dashboard");
      } else if (role === "medic") {
        navigate("/medic-dashboard");
      } else {
        navigate("/"); // fallback
      }
    }
  }, [isAuthenticated, role, navigate]);

  return (
    <div className="login-page">
      <h2 className="login-title">Login</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* (Removed) Google sign-in option */}

      {/* Email Confirmation Success Message */}
      {location.search.includes('email_confirmed_success') && (
        <div className="success-message">
          <CheckCircle style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Email Confirmed!</strong>
            <p>Your email has been successfully verified. You can now log in.</p>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="error-message">
          <Warning style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Login Failed</strong>
            <p>{error}</p>
            {error.includes('Email not confirmed') && (
              <p className="info-note">
                <Info style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                Please check your email for the confirmation link.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success Messages */}
      {message && !error && isAuthenticated && (
        <div className="success-message">
          <CheckCircle style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Login Successful!</strong>
            <p>Welcome back, {user?.email || "User"}</p>
          </div>
        </div>
      )}

      <p className="switch-text">
        Don&apos;t have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
};

export default Login;
