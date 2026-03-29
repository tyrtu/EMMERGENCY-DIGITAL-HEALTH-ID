import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { handleOAuthCallback } from '../store/authSlice';
import './Auth.css';

const OAuthCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, role, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    const processCallback = async () => {
      try {
        await dispatch(handleOAuthCallback()).unwrap();
      } catch (err) {
        console.error('OAuth callback error:', err);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    processCallback();
  }, [dispatch, navigate]);

  useEffect(() => {
    if (user && role && !loading) {
      if (role === 'patient') {
        navigate('/dashboard');
      } else if (role === 'medic') {
        navigate('/medic-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="login-page" style={{ textAlign: 'center' }}>
      <h2 className="login-title">Completing Sign In...</h2>
      {loading && (
        <div className="oauthStatus">
          <div className="oauthSpinner" />
          <p className="oauthHint">Authenticating your account...</p>
        </div>
      )}
      {error && (
        <div className="oauthStatus">
          <p className="error-text">{error}</p>
          <p className="oauthHint">Redirecting to login...</p>
        </div>
      )}
    </div>
  );
};

export default OAuthCallback;

