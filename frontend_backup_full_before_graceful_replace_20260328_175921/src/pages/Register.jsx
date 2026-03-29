import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, clearError, clearMessage } from '../store/authSlice';
import { CheckCircle, Warning, Email as EmailIcon, Info } from '@mui/icons-material';
import { Link } from "react-router-dom";
import './Auth.css'; 

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user, message, requiresConfirmation } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearMessage());
    };
  }, [dispatch]);

  useEffect(() => {
    if (message && !error) {
      setPassword('');
      setConfirmPassword('');
    }
  }, [message, error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    dispatch(registerUser({ email, password, fullName: name }));
  };


  return (
    <div className="auth-shell">
      <aside className="auth-hero">
        <div className="auth-brand">Emergency Health ID</div>
        <h2>Create your emergency identity</h2>
        <p>
          Register once and maintain a portable emergency profile with secure
          access for patients and medics.
        </p>
        <ul>
          <li>Structured medical profile</li>
          <li>Emergency QR card access</li>
          <li>Role-aware secure data workflow</li>
        </ul>
      </aside>

      <section className="register-page">
        <h2 className="register-title">Create Account</h2>
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
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
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <Warning style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
            <div>
              <strong>Registration Failed</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {message && !error && (
          <div className={requiresConfirmation ? "info-message" : "success-message"}>
            {requiresConfirmation ? (
              <>
                <EmailIcon style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
                <div>
                  <strong>Registration Successful</strong>
                  <p>{message}</p>
                  <p className="info-note">
                    <Info style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                    Please check your email inbox (and spam folder) for the confirmation link.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle style={{ fontSize: '20px', marginRight: '10px', verticalAlign: 'middle' }} />
                <div>
                  <strong>Account Created Successfully</strong>
                  <p>{message}</p>
                </div>
              </>
            )}
          </div>
        )}

        <p className="switch-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
};

export default Register;
