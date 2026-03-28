// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearError, clearMessage } from "../store/authSlice";
import { useNavigate, useLocation, Link } from "react-router-dom";
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

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('message') === 'email_confirmed_success') {
      return;
    }
  }, [location]);

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


  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "patient") {
        navigate("/dashboard");
      } else if (role === "medic") {
        navigate("/medic-dashboard");
      } else {
        navigate("/");
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

      {location.search.includes('email_confirmed_success') && (
        <div className="success-message">
          <CheckCircle style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
          <div>
            <strong>Email Confirmed!</strong>
            <p>Your email has been successfully verified. You can now log in.</p>
          </div>
        </div>
      )}

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
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
};

export default Login;
