// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";

import QRScanner from "./components/QRScanner";
import Register from "./pages/Register";
import Login from "./pages/Login";
import PatientDashboard from "./pages/PatientDashboard";
import MedicDashboard from "./pages/MedicDashboard";
import { loadUserFromSession } from "./store/authSlice";
import WelcomeSetup from "./pages/WelcomeSetup";
import PatientRouteGuard from "./components/PatientRouteGuard";
import OAuthCallback from "./pages/OAuthCallback";
import Documentation from "./pages/Documentation";

function PrivateRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const loading = useSelector((state) => state.auth.loading);

  if (loading) {
    return (
      <div className="appLoadingScreen">
        <div className="appLoadingCard">
          <div className="appLoadingSpinner" />
          <h2>Securing your session</h2>
          <p>Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUserFromSession());
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/enterprise-docs" element={<Documentation />} />

          <Route
            path="/welcome"
            element={
              <PrivateRoute>
                <WelcomeSetup />
              </PrivateRoute>
            }
          />

          <Route
            path="/scanner"
            element={
              <PrivateRoute>
                <QRScanner />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <PatientRouteGuard>
                  <PatientDashboard />
                </PatientRouteGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/dashboard"
            element={
              <PrivateRoute>
                <PatientRouteGuard>
                  <PatientDashboard />
                </PatientRouteGuard>
              </PrivateRoute>
            }
          />
          <Route
            path="/medic-dashboard"
            element={
              <PrivateRoute>
                <MedicDashboard />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
