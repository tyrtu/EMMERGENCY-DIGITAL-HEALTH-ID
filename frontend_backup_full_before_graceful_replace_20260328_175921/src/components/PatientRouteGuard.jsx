import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiClient from '../config/apiClient';

/**
 * PatientRouteGuard - Ensures patients complete welcome setup before accessing dashboard
 * Checks if patient document exists in DB
 */
const PatientRouteGuard = ({ children }) => {
  const { user, role, loading } = useSelector((state) => state.auth);
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const checkPatientExists = async () => {
      // Wait for auth to load
      if (loading) {
        return;
      }

      // If not a patient, allow access (let other guards handle it)
      if (!user?.id || role !== 'patient') {
        setChecking(false);
        return;
      }

      try {
        // Try to fetch patient document
        const response = await apiClient.get(`/api/patients/${user.id}`, {
          authId: user.id
        });
        
        // If patient exists and has data, allow access
        if (response?.data) {
          setNeedsSetup(false);
        } else {
          setNeedsSetup(true);
        }
      } catch (error) {
        // If 404 or not found, patient doesn't exist - redirect to welcome
        if (error.message?.includes('404') || 
            error.message?.includes('not found') ||
            error.response?.status === 404) {
          setNeedsSetup(true);
        } else {
          // Other errors - still allow access (will show error in dashboard)
          console.error('Error checking patient:', error);
          setNeedsSetup(false);
        }
      } finally {
        setChecking(false);
      }
    };

    checkPatientExists();
  }, [user, role, loading]);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#64748b', fontSize: '16px' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
};

export default PatientRouteGuard;

