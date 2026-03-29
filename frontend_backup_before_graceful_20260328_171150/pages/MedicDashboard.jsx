import React, { useState, useEffect, useRef } from "react";
import styles from "./MedicDashboard.module.css";
import QRScannerModal from "../components/QRScannerModal";
import EmergencyPatientView from "../components/EmergencyPatientView";
import AnalyticsView from "../components/AnalyticsView";
import { savePatientToCache, getAllCachedPatients } from "../utils/offlineCache";
import { calculatePriority } from "../utils/emergencyUtils";
import apiClient from "../config/apiClient";

import {
  QrCodeScanner,
  Emergency,
  Menu,
  Dashboard,
  QrCode,
  Search,
  Analytics,
  Person,
  Logout,
  Group,
  LocalHospital,
  Warning,
  Info,
  Error,
  Edit,
  Save,
  Cancel,
  AccessTime,
  CheckCircle,
  HealthAndSafety,
  Medication,
  FavoriteRounded,
  Assignment,
  Close,
} from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setIsMobile } from "../store/mobileSlice";
import { logoutUser } from "../store/authSlice";

// Helper function to validate if a string looks like a medical condition
const isValidMedicalCondition = (condition) => {
  if (!condition || typeof condition !== 'string') return false;
  
  const trimmed = condition.trim();
  
  // Must be at least 3 characters
  if (trimmed.length < 3) return false;
  
  // Must not be just numbers
  if (!isNaN(trimmed) || /^\d+$/.test(trimmed)) return false;
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  // Filter out common non-medical terms that might appear in QR data
  const invalidTerms = ['unknown', 'none', 'n/a', 'na', 'null', 'undefined', 'undefined', 'test', 'sample'];
  const lowerTrimmed = trimmed.toLowerCase();
  if (invalidTerms.includes(lowerTrimmed)) return false;
  
  // Filter out very short single words that are likely not conditions (unless they're common medical terms)
  if (trimmed.length < 5 && !trimmed.includes(' ')) {
    // Allow common short medical terms and abbreviations
    const allowedShortTerms = [
      'asthma', 'copd', 'hiv', 'aids', 'cvd', 'cad', 'pvd', 'dm', 'htn', 'mi', 'chf', 'ckd',
      'copd', 'diabetes', 'dm', 'htn', 'hypertension', 'asthma', 'copd', 'epilepsy', 'stroke',
      'cvd', 'cad', 'mi', 'ami', 'chf', 'ckd', 'esrd', 'pvd', 'pad', 'afib', 'vfib', 'copd',
      'emphysema', 'bronchitis', 'pneumonia', 'tb', 'covid', 'covid19'
    ];
    if (!allowedShortTerms.includes(lowerTrimmed)) return false;
  }
  
  // Allow common medical condition patterns
  const commonPatterns = [
    /diabetes/i, /hypertension/i, /asthma/i, /copd/i, /epilepsy/i, /stroke/i,
    /heart/i, /cardiac/i, /respiratory/i, /kidney/i, /liver/i, /cancer/i,
    /tumor/i, /disease/i, /disorder/i, /syndrome/i, /infection/i, /injury/i,
    /fracture/i, /arthritis/i, /osteoporosis/i, /anemia/i, /thyroid/i, /obesity/i
  ];
  
  // If it matches a common medical pattern, allow it even if it's a bit longer
  if (commonPatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }
  
  return true;
};

const MedicDashboard = () => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scannedPatient, setScannedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  // Initialize activeTab from localStorage or URL params, default to dashboard
  const [activeTab, setActiveTab] = useState(() => {
    // Try to get from URL search params first
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl) {
      return tabFromUrl;
    }
    // Then try localStorage
    const savedTab = localStorage.getItem('medicDashboard_activeTab');
    return savedTab || "dashboard";
  });
  const [patientId, setPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medicProfile, setMedicProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [patientUpdateData, setPatientUpdateData] = useState({});
  const [searchError, setSearchError] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const [multiCasualtyMode, setMultiCasualtyMode] = useState(false);
  const [casualtyList, setCasualtyList] = useState([]);
  const [selectedCasualtyIndex, setSelectedCasualtyIndex] = useState(null);
  const [scanStartTime, setScanStartTime] = useState(null); // Track response time
  const [duplicateAlert, setDuplicateAlert] = useState(null); // Alert for duplicate patient

  const isMobile = useSelector((state) => state.mobile.isMobile);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      dispatch(setIsMobile(mobile));
      if (!mobile) setIsMobileMenuOpen(false);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [dispatch]);

  // Fetch medic profile information
  useEffect(() => {
    const fetchMedicProfile = async () => {
      if (user?.id) {
        try {
          setIsLoading(true);
          const token = localStorage.getItem("token");
          const headers = {
            "Content-Type": "application/json",
            "x-auth-id": user.id,
            Authorization: `Bearer ${token}`,
          };

          const data = await apiClient.get(`/api/medics`, { authId: user.id });
          if (data) {
            const medic = data.data?.find(doctor => doctor.authId === user.id);
            if (medic) {
              setMedicProfile(medic);
            } else {
              setMedicProfile({
                name: "Dr. " + (user.user_metadata?.full_name || user.email.split('@')[0]),
                email: user.email,
                specialization: "General Practitioner",
                licenseNumber: "Pending",
                verified: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error("Failed to fetch medic profile:", error);
          setMedicProfile({
            name: "Dr. " + (user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Medic"),
            email: user?.email || "N/A",
            specialization: "General Practitioner",
            licenseNumber: "Pending",
            verified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (user) {
      fetchMedicProfile();
    }
  }, [user]);

  // Load recent scans from backend API (persistent across devices)
  useEffect(() => {
    const loadRecentScans = async () => {
      if (!user?.id) return;
      
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
        
        // Fetch recent scans from backend analytics
        const data = await apiClient.get(`/api/analytics/recent-logs/${user.id}?limit=20`, { authId: user.id });
        
        if (data) {
          const scans = (data.data || []).map(scan => ({
            ...scan,
            scannedAt: scan.scannedAt || scan.createdAt,
            type: 'Emergency',
            status: scan.scanStatus || 'normal',
            priority: scan.scanStatus || 'normal',
            // Map backend data to frontend format
            n: scan.patientInfo?.name,
            bg: scan.patientInfo?.bloodGroup,
            id: scan.patientId,
            age: scan.patientInfo?.age,
            alg: scan.allergies || [],
            med: scan.medications || [],
            criticalConditions: scan.medicalConditions || scan.conditions || [],
            ec: null, // Will be fetched from patient data if needed
            doc: null
          }));
          setRecentScans(scans);
        } else {
          // Fallback to localStorage if backend fails
          const stored = localStorage.getItem(`recentScans_${user.id}`);
      if (stored) {
        setRecentScans(JSON.parse(stored));
          }
        }
      } catch (error) {
        console.error('Failed to load recent scans from backend:', error);
        // Fallback to localStorage
        const stored = localStorage.getItem(`recentScans_${user.id}`);
        if (stored) {
          setRecentScans(JSON.parse(stored));
        }
      }
    };
    
    loadRecentScans();
  }, [user]);

  // Save activeTab to localStorage and URL when it changes
  useEffect(() => {
    if (activeTab) {
      // Save to localStorage
      localStorage.setItem('medicDashboard_activeTab', activeTab);
      
      // Update URL without reloading
      const url = new URL(window.location);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url);
    }
  }, [activeTab]);

  // Prevent body scroll and remove margins when modal is open
  useEffect(() => {
    if (showPatientDetails) {
      // Store original values
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyMargin = document.body.style.margin;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalHtmlMargin = document.documentElement.style.margin;
      
      // Remove all margins and prevent scroll
      document.body.style.overflow = 'hidden';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';
      
      return () => {
        // Restore original values
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.margin = originalBodyMargin;
        document.body.style.padding = '';
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.margin = originalHtmlMargin;
        document.documentElement.style.padding = '';
      };
    }
  }, [showPatientDetails]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      console.log("Logout successful, redirecting to login page");
      navigate("/login");
    } catch (err) {
      console.error("Logout process failed:", err);
    }
  };

  // Track scan to analytics
  const trackScan = async (scanData, responseTime, priorityResult) => {
    try {
      if (!user?.id) return;
      
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Fetch full patient data to get proper medical conditions
      let fullPatientData = null;
      const patientId = scanData.id || scanData.authId;
      
      if (patientId && patientId !== 'unknown') {
        try {
          const patientData = await apiClient.get(`/api/patients/${patientId}`, { authId: user.id });
          
          if (patientData) {
            fullPatientData = patientData.data || patientData;
            console.log('Fetched patient data for analytics:', {
              hasMedicalInfo: !!fullPatientData?.medicalInfo,
              hasMedicalConditions: !!fullPatientData?.medicalInfo?.medicalConditions,
              conditionsCount: fullPatientData?.medicalInfo?.medicalConditions?.length || 0
            });
          } else {
            console.warn('Failed to fetch patient data');
          }
        } catch (err) {
          console.warn('Could not fetch full patient data for analytics:', err);
        }
      }

      // Extract medical conditions - Priority: Full patient data > QR data
      // QR code only has criticalConditions, More Info button fetches full medicalInfo.medicalConditions
      const medicalConditions = [];
      
      // First try: medicalInfo.medicalConditions (structured data from database - fetched via More Info or API)
      if (fullPatientData?.medicalInfo?.medicalConditions && Array.isArray(fullPatientData.medicalInfo.medicalConditions)) {
        fullPatientData.medicalInfo.medicalConditions.forEach(condition => {
          if (condition && typeof condition === 'object' && condition.condition && typeof condition.condition === 'string') {
            const trimmed = condition.condition.trim();
            if (trimmed && isValidMedicalCondition(trimmed)) {
              medicalConditions.push(trimmed);
            }
          } else if (condition && typeof condition === 'string') {
            const trimmed = condition.trim();
            if (trimmed && isValidMedicalCondition(trimmed)) {
              medicalConditions.push(trimmed);
            }
          }
        });
      }
      
      // Second try: emergencyInfo.criticalConditions (from full patient data)
      if (medicalConditions.length === 0 && fullPatientData?.emergencyInfo?.criticalConditions && Array.isArray(fullPatientData.emergencyInfo.criticalConditions)) {
        fullPatientData.emergencyInfo.criticalConditions.forEach(condition => {
          if (condition && typeof condition === 'string') {
            const trimmed = condition.trim();
            if (trimmed && isValidMedicalCondition(trimmed)) {
              medicalConditions.push(trimmed);
            }
          }
        });
      }
      
      // Third try: criticalConditions from QR data (minimal - only critical info in QR)
      if (medicalConditions.length === 0 && scanData.criticalConditions && Array.isArray(scanData.criticalConditions)) {
        scanData.criticalConditions.forEach(condition => {
          if (condition && typeof condition === 'string') {
            const trimmed = condition.trim();
            if (trimmed && isValidMedicalCondition(trimmed)) {
              medicalConditions.push(trimmed);
            }
          }
        });
      }
      
      // Log for debugging
      console.log('Medical conditions extracted:', {
        hasFullData: !!fullPatientData,
        medicalInfoConditions: fullPatientData?.medicalInfo?.medicalConditions?.length || 0,
        emergencyInfoConditions: fullPatientData?.emergencyInfo?.criticalConditions?.length || 0,
        qrCriticalConditions: scanData.criticalConditions?.length || 0,
        finalCount: medicalConditions.length,
        conditions: medicalConditions,
        note: 'QR code only contains criticalConditions. Use More Info button to fetch full medicalInfo.medicalConditions'
      });

      // Extract allergies from full patient data or QR data
      const allergies = [];
      
      if (fullPatientData?.emergencyInfo?.criticalAllergies) {
        fullPatientData.emergencyInfo.criticalAllergies.forEach(allergy => {
          if (allergy && typeof allergy === 'string') {
            allergies.push(allergy.trim());
          }
        });
      }
      
      // Fallback to QR data
      if (allergies.length === 0 && scanData.alg) {
        scanData.alg.forEach(allergy => {
          if (allergy && typeof allergy === 'string') {
            const trimmed = allergy.trim();
            // Basic validation for allergies
            if (trimmed && trimmed.length > 2 && isNaN(trimmed) && /[a-zA-Z]/.test(trimmed)) {
              allergies.push(trimmed);
            }
          }
        });
      }

      // Extract medications from full patient data or QR data
      const medications = [];
      
      if (fullPatientData?.medicalInfo?.medications) {
        fullPatientData.medicalInfo.medications.forEach(med => {
          if (med.name && typeof med.name === 'string') {
            medications.push(med.name.trim());
          }
        });
      }
      
      // Fallback to QR data
      if (medications.length === 0 && scanData.med) {
        scanData.med.forEach(med => {
          if (med && typeof med === 'string') {
            const trimmed = med.trim();
            if (trimmed && trimmed.length > 2) {
              medications.push(trimmed);
            }
          }
        });
      }

      // Keep conditions for backward compatibility (only medical conditions)
      const conditions = medicalConditions;

      const trackData = {
        medicId: user.id,
        patientId: patientId || 'unknown',
        patientInfo: {
          name: scanData.n || scanData.fullName || fullPatientData?.basicInfo?.fullName || 'Unknown',
          age: scanData.age || fullPatientData?.basicInfo?.age,
          gender: scanData.gender || fullPatientData?.basicInfo?.gender,
          bloodGroup: scanData.bg || scanData.bloodGroup || fullPatientData?.basicInfo?.bloodGroup
        },
        scanStatus: priorityResult.priority === 'critical' ? 'critical' : 
                   priorityResult.priority === 'caution' ? 'caution' : 'normal',
        responseTime: responseTime, // in seconds
        conditions: conditions, // For backward compatibility
        medicalConditions: medicalConditions.filter(c => c && c.trim().length > 0), // Ensure no empty strings
        allergies: allergies.filter(a => a && a.trim().length > 0),
        medications: medications.filter(m => m && m.trim().length > 0),
        bloodGroup: scanData.bg || scanData.bloodGroup || fullPatientData?.basicInfo?.bloodGroup
      };

      // Log before sending
      console.log('Sending track data:', {
        medicalConditions: trackData.medicalConditions,
        medicalConditionsCount: trackData.medicalConditions.length,
        allergiesCount: trackData.allergies.length,
        medicationsCount: trackData.medications.length
      });

      try {
        await apiClient.post('/api/analytics/track-scan', trackData, { authId: user.id });
        console.log('Scan tracked successfully');
      } catch (error) {
        console.error('Failed to track scan:', error);
        // Don't block the scan flow if tracking fails
      }
    } catch (error) {
      console.error('Error in trackScan:', error);
      // Don't block the scan flow if tracking fails
    }
  };

  const handleScanSuccess = (scanData) => {
    console.log("QR code scanned successfully:", scanData);
    
    // Calculate response time
    const responseTime = scanStartTime ? (Date.now() - scanStartTime) / 1000 : 0; // in seconds
    setScanStartTime(null);
    
    // Calculate priority
    const priorityResult = calculatePriority(scanData);
    
    // Add to recent scans with timestamp
    const newScan = {
      ...scanData,
      scannedAt: new Date().toISOString(),
      type: 'Emergency',
      status: priorityResult.priority === 'critical' ? 'critical' : 
             priorityResult.priority === 'caution' ? 'caution' : 'normal',
      priority: priorityResult.priority,
      alerts: priorityResult.alerts
    };
    
    // Save to offline cache
    savePatientToCache(newScan);
    
    // Track scan to analytics
    trackScan(scanData, responseTime, priorityResult);
    
    if (multiCasualtyMode) {
      // Check if patient already exists in casualty list
      const patientId = scanData.id || scanData.authId;
      const patientName = scanData.n || scanData.fullName || 'Unknown';
      
      // Check for duplicate by patient ID
      const isDuplicate = casualtyList.some(casualty => {
        const existingId = casualty.id || casualty.authId;
        return existingId && patientId && existingId === patientId;
      });
      
      if (isDuplicate) {
        // Show alert for duplicate patient
        setDuplicateAlert({
          message: `Patient "${patientName}" is already in the casualty list.`,
          patientName: patientName,
          severity: 'warning'
        });
        
        // Auto-hide alert after 5 seconds
        setTimeout(() => {
          setDuplicateAlert(null);
        }, 5000);
        
        // Don't add duplicate, but still track the scan for analytics
        return;
      }
      
      // Add to casualty list if not duplicate
      const updatedCasualties = [...casualtyList, newScan];
      setCasualtyList(updatedCasualties);
      // Auto-select the newly scanned patient
      setSelectedCasualtyIndex(updatedCasualties.length - 1);
      
      // Show success message
      setDuplicateAlert({
        message: `Patient "${patientName}" added to casualty list.`,
        patientName: patientName,
        severity: 'success'
      });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setDuplicateAlert(null);
      }, 3000);
      
      // Don't close scanner in multi-casualty mode
    } else {
      // Single scan mode
    const updatedScans = [newScan, ...recentScans.slice(0, 9)];
    setRecentScans(updatedScans);
      
      // Save to localStorage as backup (will be synced to backend via analytics)
      if (user?.id) {
        localStorage.setItem(`recentScans_${user.id}`, JSON.stringify(updatedScans));
      }
    
    setScannedPatient(scanData);
    setIsScannerOpen(false);
    setShowPatientDetails(true);
    }
  };

  const handleViewDetails = () => {
    setShowPatientDetails(true);
  };

  const handleCloseDetails = () => {
    setShowPatientDetails(false);
  };

  // Fetch patient by Health ID (EMH-XXXXXX)
  const fetchPatient = async () => {
    if (!patientId.trim()) {
      setSearchError("Please enter a Health ID");
      return;
    }

    // Validate Health ID format (EMH-XXXXXX)
    const healthIdPattern = /^EMH-\d{6}$/i;
    const trimmedId = patientId.trim().toUpperCase();
    
    if (!healthIdPattern.test(trimmedId)) {
      setSearchError("Please enter a valid Health ID (format: EMH-XXXXXX)");
      return;
    }

    try {
      setSearchError("");
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        "x-auth-id": user.id,
        Authorization: `Bearer ${token}`,
      };

      const data = await apiClient.get(`/api/patients/${trimmedId}`, { authId: user.id });
      
      if (data && data.data) {
        setSelectedPatient(data.data);
        setPatientUpdateData(data.data);
        setSearchError(null);
        // Update patientId state to the found patient's healthId for update operations
        setPatientId(data.data.healthId || data.data.authId);
      } else {
        setSearchError(data?.message || "Patient not found");
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error("Error fetching patient:", error);
      setSearchError("Failed to fetch patient. Please try again.");
      setSelectedPatient(null);
    }
  };

  // Update patient information
  const updatePatient = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        "x-auth-id": user.id,
        Authorization: `Bearer ${token}`,
      };

      // Use the selected patient's authId for update, not the search input
      const updateId = selectedPatient?.authId || patientId;
      const data = await apiClient.put(`/api/patients/${updateId}`, patientUpdateData, { authId: user.id });

      if (data && data.data) {
        setSelectedPatient(data.data);
        setIsEditing(false);
        alert("Patient updated successfully!");
      } else {
        alert("Failed to update patient: " + (data?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error updating patient:", error);
      alert("Failed to update patient. Please try again.");
    }
  };

  // Handle field changes for patient update
  const handleFieldChange = (fieldPath, value) => {
    setPatientUpdateData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const path = fieldPath.split('.');
      let current = newData;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      
      current[path[path.length - 1]] = value;
      return newData;
    });
  };

  // Handle array field changes
  const handleArrayFieldChange = (fieldPath, index, value) => {
    setPatientUpdateData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const path = fieldPath.split('.');
      let current = newData;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      
      const arrayField = path[path.length - 1];
      if (!current[arrayField]) current[arrayField] = [];
      current[arrayField][index] = value;
      
      return newData;
    });
  };

  // Handle nested object changes in arrays
  const handleNestedArrayFieldChange = (fieldPath, index, nestedField, value) => {
    setPatientUpdateData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const path = fieldPath.split('.');
      let current = newData;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      
      const arrayField = path[path.length - 1];
      if (!current[arrayField]) current[arrayField] = [];
      if (!current[arrayField][index]) current[arrayField][index] = {};
      current[arrayField][index][nestedField] = value;
      
      return newData;
    });
  };

  // Add new item to array field
  const addArrayItem = (fieldPath, defaultValue = "") => {
    setPatientUpdateData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const path = fieldPath.split('.');
      let current = newData;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      
      const arrayField = path[path.length - 1];
      if (!current[arrayField]) current[arrayField] = [];
      current[arrayField].push(defaultValue);
      
      return newData;
    });
  };

  // Remove item from array field
  const removeArrayItem = (fieldPath, index) => {
    setPatientUpdateData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const path = fieldPath.split('.');
      let current = newData;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) return prev;
        current = current[path[i]];
      }
      
      const arrayField = path[path.length - 1];
      if (current[arrayField] && Array.isArray(current[arrayField])) {
        current[arrayField].splice(index, 1);
      }
      
      return newData;
    });
  };

  // Calculate time ago for recent scans
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const scanned = new Date(timestamp);
    const diffMs = now - scanned;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ backgroundColor: color + '20' }}>
        <Icon style={{ color: color }} />
      </div>
      <div className={styles.statContent}>
        <p className={styles.statLabel}>{label}</p>
        <h3 className={styles.statValue}>{value}</h3>
        {trend && (
          <span className={styles.statTrend} style={{ color: trend.up ? '#10b981' : '#ef4444' }}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );

  const QuickActionCard = ({ icon: Icon, title, description, buttonText, onClick, color = "#3b82f6" }) => (
    <div className={styles.quickActionCard}>
      <div className={styles.actionIcon} style={{ backgroundColor: color + '20', color: color }}>
        <Icon />
      </div>
      <div className={styles.actionContent}>
        <h4>{title}</h4>
        <p>{description}</p>
        <button 
          className={styles.actionButton} 
          onClick={onClick}
          style={{ backgroundColor: color }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  const RecentScanItem = ({ scan }) => {
    const statusColors = {
      critical: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
      caution: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
      normal: { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' }
    };

    const status = scan.status || 'normal';
    const colors = statusColors[status];

    return (
      <div className={styles.recentScanItem} onClick={() => {
        setScannedPatient(scan);
        setShowPatientDetails(true);
      }}>
        <div className={styles.scanItemLeft}>
          <div className={styles.scanAvatar}>
            {(scan.n || scan.fullName || scan.name || 'U')[0].toUpperCase()}
          </div>
          <div className={styles.scanInfo}>
            <p className={styles.scanName}>{scan.n || scan.fullName || scan.name || 'Unknown'}</p>
            <p className={styles.scanTime}>{getTimeAgo(scan.scannedAt)}</p>
          </div>
        </div>
        <div className={styles.scanItemRight}>
          <span 
            className={styles.scanStatus}
            style={{ 
              backgroundColor: colors.bg, 
              color: colors.text,
              border: `1px solid ${colors.border}`
            }}
          >
            {scan.type}
          </span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            {/* Emergency Scanner Section */}
            <section className={styles.section}>
              <div className={styles.emergencyScannerCard}>
                <div className={styles.scannerContent}>
                  <div className={styles.scannerLeft}>
                    <div className={styles.scannerIcon}>
                      <QrCodeScanner style={{ fontSize: '48px' }} />
                    </div>
                    <div className={styles.scannerText}>
                      <h2>Emergency QR Scanner</h2>
                      <p>Quick access to patient emergency information</p>
                      {multiCasualtyMode && (
                        <div style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          backgroundColor: '#fef3c7',
                          border: '2px solid #d97706',
                          borderRadius: '6px',
                          color: '#92400e',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'inline-block'
                        }}>
                          <Warning style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                          MULTI-CASUALTY MODE ACTIVE ({casualtyList.length} patients)
                    </div>
                      )}
                  </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    className={styles.emergencyScanBtn}
                      onClick={() => {
                        setScanStartTime(Date.now());
                        setIsScannerOpen(true);
                      }}
                  >
                    <QrCodeScanner />
                    SCAN PATIENT QR CODE
                  </button>
                    <button
                      onClick={() => {
                        setMultiCasualtyMode(!multiCasualtyMode);
                        if (!multiCasualtyMode) {
                          setCasualtyList([]);
                          setSelectedCasualtyIndex(null);
                        } else {
                          // Clear alert when entering multi-casualty mode
                          setDuplicateAlert(null);
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: multiCasualtyMode ? '#dc2626' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <Group style={{ fontSize: '18px' }} />
                      {multiCasualtyMode ? 'Exit Multi-Casualty Mode' : 'Multi-Casualty Mode'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Multi-Casualty Incident Mode */}
            {multiCasualtyMode && (
              <section className={styles.section}>
                {/* Duplicate Alert - shown when in multi-casualty mode */}
                {duplicateAlert && (
                  <div style={{
                    padding: '16px 20px',
                    backgroundColor: duplicateAlert.severity === 'warning' ? '#fef3c7' : '#d1fae5',
                    border: `2px solid ${duplicateAlert.severity === 'warning' ? '#d97706' : '#10b981'}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      {duplicateAlert.severity === 'warning' ? (
                        <Warning style={{ color: '#d97706', fontSize: '24px' }} />
                      ) : (
                        <CheckCircle style={{ color: '#10b981', fontSize: '24px' }} />
                      )}
                      <p style={{
                        margin: 0,
                        color: duplicateAlert.severity === 'warning' ? '#92400e' : '#065f46',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {duplicateAlert.message}
                      </p>
                    </div>
                    <button
                      onClick={() => setDuplicateAlert(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: duplicateAlert.severity === 'warning' ? '#92400e' : '#065f46',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <Close style={{ fontSize: '20px' }} />
                    </button>
                  </div>
                )}

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.sectionTitle}>
                      <Group style={{ marginRight: '8px' }} />
                      Multi-Casualty Incident ({casualtyList.length})
                    </h3>
                    <button
                      onClick={() => {
                        setCasualtyList([]);
                        setSelectedCasualtyIndex(null);
                        setDuplicateAlert(null);
                      }}
                      className={styles.clearAllBtn}
                    >
                      Clear All
                    </button>
                  </div>
                  
                  {casualtyList.length > 0 ? (
                    <div className={styles.multiCasualtyWrapper}>
                      <div className={styles.multiCasualtyLayout}>
                      {/* Casualty List - Sidebar */}
                      <div className={styles.patientListSidebar}>
                        <div className={styles.patientListHeader}>
                          <div className={styles.patientCountBadge}>
                            {casualtyList.length}
                          </div>
                          <h4 className={styles.patientListTitle}>Scanned Patients</h4>
                        </div>
                        <div className={styles.patientListContainer}>
                          {casualtyList.map((casualty, index) => {
                            const priorityResult = calculatePriority(casualty);
                            const isSelected = selectedCasualtyIndex === index;
                            return (
                              <div
                                key={index}
                                onClick={() => setSelectedCasualtyIndex(index)}
                                className={`${styles.casualtyCard} ${isSelected ? styles.casualtyCardActive : ''}`}
                                data-priority={priorityResult.priority}
                              >
                                <div className={styles.casualtyCardHeader}>
                                  <div className={styles.casualtyCardAvatar}>
                                    {(casualty.n || casualty.fullName || 'U')[0].toUpperCase()}
                                  </div>
                                  <div className={styles.casualtyCardInfo}>
                                    <div className={styles.casualtyCardName}>
                                      {casualty.n || casualty.fullName || 'Unknown'}
                                    </div>
                                    <div className={styles.casualtyCardBadges}>
                                      <span className={styles.bloodBadge}>
                                        {casualty.bg || casualty.bloodGroup || 'N/A'}
                                      </span>
                                      {priorityResult.alerts.length > 0 && (
                                        <span className={styles.alertBadge}>
                                          {priorityResult.alerts.length} alert{priorityResult.alerts.length !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className={styles.casualtyCardPriority}>
                                  {priorityResult.priority === 'critical' ? 
                                    <Error className={styles.priorityIcon} /> : 
                                   priorityResult.priority === 'caution' ? 
                                    <Warning className={styles.priorityIcon} /> : 
                                    <CheckCircle className={styles.priorityIcon} />}
                                  <span className={styles.priorityText}>{priorityResult.priority.toUpperCase()}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Selected Casualty Details - Main Content */}
                      <div className={styles.casualtyMainContent}>
                        {selectedCasualtyIndex !== null && casualtyList[selectedCasualtyIndex] ? (
                          <div className={styles.casualtyDetailsWrapper}>
                            <div className={styles.casualtyDetailsHeader}>
                              <div className={styles.casualtyDetailsHeaderLeft}>
                                <h3 className={styles.casualtyDetailsTitle}>
                                  {casualtyList[selectedCasualtyIndex].n || casualtyList[selectedCasualtyIndex].fullName || 'Patient Details'}
                                </h3>
                                <p className={styles.casualtyDetailsSubtitle}>
                                  Health ID: {casualtyList[selectedCasualtyIndex].healthId || 'N/A'} • 
                                  Blood Group: {casualtyList[selectedCasualtyIndex].bg || casualtyList[selectedCasualtyIndex].bloodGroup || 'N/A'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const updated = casualtyList.filter((_, i) => i !== selectedCasualtyIndex);
                                  setCasualtyList(updated);
                                  setSelectedCasualtyIndex(updated.length > 0 ? Math.min(selectedCasualtyIndex, updated.length - 1) : null);
                                }}
                                className={styles.removeCasualtyBtn}
                              >
                                <Close style={{ fontSize: '18px' }} />
                                Remove Patient
                              </button>
                            </div>
                            <div className={styles.casualtyDetailsBody}>
                              <EmergencyPatientView 
                                patientData={casualtyList[selectedCasualtyIndex]} 
                                isUnconscious={false}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className={styles.casualtyEmptyState}>
                            <Person style={{ fontSize: '80px', color: '#cbd5e1', marginBottom: '20px' }} />
                            <h3>Select a Patient</h3>
                            <p>Click on a patient from the list to view their details</p>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#94a3b8'
                    }}>
                      <Group style={{ fontSize: '64px', marginBottom: '16px' }} />
                      <p>No patients scanned yet. Start scanning to add patients to triage list.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Quick Actions */}
            <section className={styles.section}>
              <div className={styles.card}>
                <h3 className={styles.sectionTitle}>Quick Actions</h3>
                <div className={styles.quickActionsGrid}>
                  <QuickActionCard
                    icon={Search}
                    title="Search Patient"
                    description="Find patient records and medical history"
                    buttonText="Start Search"
                    onClick={() => setActiveTab("search")}
                    color="#3b82f6"
                  />
                  <QuickActionCard
                    icon={Assignment}
                    title="Patient Records"
                    description="Access and manage patient records"
                    buttonText="View Records"
                    onClick={() => setActiveTab("search")}
                    color="#10b981"
                  />
                  <QuickActionCard
                    icon={Analytics}
                    title="View Analytics"
                    description="Practice performance and patient trends"
                    buttonText="See Analytics"
                    onClick={() => setActiveTab("analytics")}
                    color="#8b5cf6"
                  />
                  <QuickActionCard
                    icon={HealthAndSafety}
                    title="Emergency Access"
                    description="Quick access to critical patient info"
                    buttonText="Emergency Mode"
                    onClick={() => setIsScannerOpen(true)}
                    color="#ef4444"
                  />
                </div>
              </div>
            </section>

            {/* Recent Scans */}
            <section className={styles.section}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.sectionTitle}>
                    <AccessTime style={{ marginRight: '8px' }} />
                    Recent Scans
                  </h3>
                  <span className={styles.badge}>{recentScans.length}</span>
                </div>
                <div className={styles.recentScansList}>
                  {recentScans.length > 0 ? (
                    recentScans.slice(0, 5).map((scan, index) => (
                      <RecentScanItem key={index} scan={scan} />
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <QrCode style={{ fontSize: '48px', color: '#cbd5e1' }} />
                      <p>No recent scans</p>
                      <button 
                        className={styles.emptyStateBtn}
                        onClick={() => {
                        setScanStartTime(Date.now());
                        setIsScannerOpen(true);
                      }}
                      >
                        Scan Your First Patient
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {scannedPatient && (
              <section className={styles.section}>
                <div className={styles.card}>
                  <h3 className={styles.sectionTitle}>Last Scanned Patient</h3>
                  <div className={styles.lastScannedPreview}>
                    <div className={styles.patientQuickInfo}>
                      <div className={styles.patientAvatar}>
                        {(scannedPatient.n || scannedPatient.fullName || 'U')[0].toUpperCase()}
                      </div>
                      <div className={styles.patientDetails}>
                        <h4>{scannedPatient.n || scannedPatient.fullName || scannedPatient.name || "Unknown Patient"}</h4>
                        <p>Blood Group: {scannedPatient.bg || scannedPatient.bloodGroup || "N/A"} • Age: {scannedPatient.age || "N/A"}</p>
                      </div>
                    </div>
                    <button
                      className={styles.viewDetailsBtn}
                      onClick={handleViewDetails}
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        );

      case "scan":
        return (
          <section className={styles.section}>
            <div className={styles.card}>
              <h2>Scan Patient QR Code</h2>
              <div className={styles.scannerSection}>
                <div className={styles.scannerButton}>
                  <button
                    className={styles.scanBtn}
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <QrCodeScanner />
                    Open QR Scanner
                  </button>
                  <p className={styles.scannerDescription}>
                    Scan a patient's QR code to access their emergency medical information.
                    The scanner will automatically decrypt and display the patient's data.
                  </p>
                </div>

                <div className={styles.scanHistorySection}>
                  <h3>Scan History</h3>
                  <div className={styles.scanHistoryList}>
                    {recentScans.length > 0 ? (
                      recentScans.map((scan, index) => (
                        <RecentScanItem key={index} scan={scan} />
                      ))
                    ) : (
                      <div className={styles.emptyState}>
                        <QrCode style={{ fontSize: '64px', color: '#cbd5e1' }} />
                        <p>No scans yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case "search":
        return (
          <section className={styles.section}>
            <div className={styles.card}>
              <h2>Patient Management</h2>
              <div className={styles.searchSection}>
                <div className={styles.searchInputGroup}>
                  <input
                    type="text"
                    placeholder="Enter Health ID (e.g., EMH-123456)..."
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className={styles.searchInput}
                    onKeyPress={(e) => e.key === 'Enter' && fetchPatient()}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <button className={styles.searchBtn} onClick={fetchPatient}>
                    <Search />
                    Search Patient
                  </button>
                </div>

                {searchError && (
                  <div className={styles.errorMessage}>
                    {searchError}
                  </div>
                )}

                {selectedPatient && (
                  <div className={styles.patientManagementSection}>
                    <div className={styles.patientHeader}>
                      <h3>Patient: {selectedPatient.basicInfo?.fullName}</h3>
                      <div className={styles.patientActions}>
                        {!isEditing ? (
                          <button 
                            className={styles.editBtn}
                            onClick={() => setIsEditing(true)}
                          >
                            <Edit />
                            Edit Medical Info
                          </button>
                        ) : (
                          <>
                            <button 
                              className={styles.saveBtn}
                              onClick={updatePatient}
                            >
                              <Save />
                              Save Changes
                            </button>
                            <button 
                              className={styles.cancelBtn}
                              onClick={() => {
                                setIsEditing(false);
                                setPatientUpdateData(selectedPatient);
                              }}
                            >
                              <Cancel />
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Basic Information - READ ONLY */}
                    <div className={styles.infoSection}>
                      <h4>Basic Information</h4>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <label>Full Name</label>
                          <div className={styles.readOnlyField}>
                            {selectedPatient.basicInfo?.fullName || 'N/A'}
                          </div>
                        </div>
                        <div className={styles.infoItem}>
                          <label>Age</label>
                          <div className={styles.readOnlyField}>
                            {selectedPatient.basicInfo?.age || 'N/A'}
                          </div>
                        </div>
                        <div className={styles.infoItem}>
                          <label>Gender</label>
                          <div className={styles.readOnlyField}>
                            {selectedPatient.basicInfo?.gender || 'N/A'}
                          </div>
                        </div>
                        <div className={styles.infoItem}>
                          <label>Blood Group</label>
                          {isEditing ? (
                            <select 
                              value={patientUpdateData.basicInfo?.bloodGroup || ''}
                              onChange={(e) => handleFieldChange('basicInfo.bloodGroup', e.target.value)}
                              className={styles.editInput}
                            >
                              <option value="">Select Blood Group</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.basicInfo?.bloodGroup || 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Emergency Information */}
                    <div className={styles.infoSection}>
                      <h4>Emergency Information</h4>
                      
                      {/* Preferred Hospital */}
                      <div className={styles.subsectionTitle}>Preferred Hospital in Emergency</div>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <label>Hospital Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.emergencyInfo?.preferredHospitalInEmergency?.name || ''}
                              onChange={(e) => handleFieldChange('emergencyInfo.preferredHospitalInEmergency.name', e.target.value)}
                              placeholder="Enter hospital name"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.emergencyInfo?.preferredHospitalInEmergency?.name || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Hospital Address</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.emergencyInfo?.preferredHospitalInEmergency?.address || ''}
                              onChange={(e) => handleFieldChange('emergencyInfo.preferredHospitalInEmergency.address', e.target.value)}
                              placeholder="Enter hospital address"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.emergencyInfo?.preferredHospitalInEmergency?.address || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Hospital Phone</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.emergencyInfo?.preferredHospitalInEmergency?.phone || ''}
                              onChange={(e) => handleFieldChange('emergencyInfo.preferredHospitalInEmergency.phone', e.target.value)}
                              placeholder="Enter hospital phone"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.emergencyInfo?.preferredHospitalInEmergency?.phone || 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Doctor */}
                      <div className={styles.subsectionTitle}>Primary Doctor</div>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <label>Doctor Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.emergencyInfo?.primaryDoctor?.name || ''}
                              onChange={(e) => handleFieldChange('emergencyInfo.primaryDoctor.name', e.target.value)}
                              placeholder="Enter doctor name"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.emergencyInfo?.primaryDoctor?.name || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Hospital</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.emergencyInfo?.primaryDoctor?.hospital || ''}
                              onChange={(e) => handleFieldChange('emergencyInfo.primaryDoctor.hospital', e.target.value)}
                              placeholder="Enter hospital"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.emergencyInfo?.primaryDoctor?.hospital || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Contact</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.emergencyInfo?.primaryDoctor?.contact || ''}
                              onChange={(e) => handleFieldChange('emergencyInfo.primaryDoctor.contact', e.target.value)}
                              placeholder="Enter contact"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.emergencyInfo?.primaryDoctor?.contact || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Email</label>
                          {isEditing ? (
                            <input
                              type="email"
                              value={patientUpdateData.emergencyInfo?.primaryDoctor?.email || ''}
                              onChange={(e) => handleFieldChange('emergencyInfo.primaryDoctor.email', e.target.value)}
                              placeholder="Enter email"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.emergencyInfo?.primaryDoctor?.email || 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Emergency Contacts */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Primary Emergency Contacts</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.emergencyInfo?.primaryEmergencyContacts || []).map((contact, index) => (
                              <div key={index} className={styles.emergencyContactItem}>
                                <div className={styles.contactGrid}>
                                  <input
                                    type="text"
                                    value={contact.name || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('emergencyInfo.primaryEmergencyContacts', index, 'name', e.target.value)}
                                    placeholder="Contact name"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="text"
                                    value={contact.relation || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('emergencyInfo.primaryEmergencyContacts', index, 'relation', e.target.value)}
                                    placeholder="Relation"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="text"
                                    value={contact.phone || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('emergencyInfo.primaryEmergencyContacts', index, 'phone', e.target.value)}
                                    placeholder="Phone"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="email"
                                    value={contact.email || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('emergencyInfo.primaryEmergencyContacts', index, 'email', e.target.value)}
                                    placeholder="Email"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="text"
                                    value={contact.address || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('emergencyInfo.primaryEmergencyContacts', index, 'address', e.target.value)}
                                    placeholder="Address"
                                    className={styles.editInput}
                                  />
                                  <label className={styles.checkboxLabel}>
                                    <input
                                      type="checkbox"
                                      checked={contact.isPrimary || false}
                                      onChange={(e) => handleNestedArrayFieldChange('emergencyInfo.primaryEmergencyContacts', index, 'isPrimary', e.target.checked)}
                                    />
                                    Primary Contact
                                  </label>
                                </div>
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('emergencyInfo.primaryEmergencyContacts', index)}
                                >
                                  Remove Contact
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('emergencyInfo.primaryEmergencyContacts', {
                                name: '',
                                relation: '',
                                phone: '',
                                email: '',
                                address: '',
                                isPrimary: false
                              })}
                            >
                              Add Emergency Contact
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.emergencyInfo?.primaryEmergencyContacts || []).length > 0 ? (
                              <div className={styles.contactsGrid}>
                                {selectedPatient.emergencyInfo.primaryEmergencyContacts.map((contact, index) => (
                                  <div key={index} className={`${styles.contactCard} ${contact.isPrimary ? styles.primaryContact : ''}`}>
                                    <div className={styles.contactHeader}>
                                      <span className={styles.contactName}>{contact.name}</span>
                                      {contact.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                                    </div>
                                    <div className={styles.contactDetails}>
                                      <div className={styles.contactField}>
                                        <span className={styles.contactLabel}>Relation:</span>
                                        <span className={styles.contactValue}>{contact.relation}</span>
                                      </div>
                                      <div className={styles.contactField}>
                                        <span className={styles.contactLabel}>Phone:</span>
                                        <span className={styles.contactValue}>{contact.phone}</span>
                                      </div>
                                      {contact.email && (
                                        <div className={styles.contactField}>
                                          <span className={styles.contactLabel}>Email:</span>
                                          <span className={styles.contactValue}>{contact.email}</span>
                                        </div>
                                      )}
                                      {contact.address && (
                                        <div className={styles.contactField}>
                                          <span className={styles.contactLabel}>Address:</span>
                                          <span className={styles.contactValue}>{contact.address}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No emergency contacts recorded</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Critical Allergies */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Critical Allergies</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.emergencyInfo?.criticalAllergies || []).map((allergy, index) => (
                              <div key={index} className={styles.arrayItem}>
                                <input
                                  type="text"
                                  value={allergy}
                                  onChange={(e) => handleArrayFieldChange('emergencyInfo.criticalAllergies', index, e.target.value)}
                                  placeholder="Enter allergy"
                                  className={styles.editInput}
                                />
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('emergencyInfo.criticalAllergies', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('emergencyInfo.criticalAllergies', '')}
                            >
                              Add Allergy
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.emergencyInfo?.criticalAllergies || []).length > 0 ? (
                              <div className={styles.chipsContainer}>
                                {selectedPatient.emergencyInfo.criticalAllergies.map((allergy, index) => (
                                  <span key={index} className={styles.allergyChip}>
                                    {allergy}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No allergies recorded</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Current Medications */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Current Medications</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.emergencyInfo?.currentMedications || []).map((medication, index) => (
                              <div key={index} className={styles.arrayItem}>
                                <input
                                  type="text"
                                  value={medication}
                                  onChange={(e) => handleArrayFieldChange('emergencyInfo.currentMedications', index, e.target.value)}
                                  placeholder="Enter medication"
                                  className={styles.editInput}
                                />
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('emergencyInfo.currentMedications', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('emergencyInfo.currentMedications', '')}
                            >
                              Add Medication
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.emergencyInfo?.currentMedications || []).length > 0 ? (
                              <div className={styles.medicationsList}>
                                {selectedPatient.emergencyInfo.currentMedications.map((medication, index) => (
                                  <div key={index} className={styles.medicationItem}>
                                    <Medication className={styles.medicationIcon} />
                                    <span className={styles.medicationName}>{medication}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No medications recorded</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Critical Conditions */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Medical Conditions</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.emergencyInfo?.criticalConditions || []).map((condition, index) => (
                              <div key={index} className={styles.arrayItem}>
                                <input
                                  type="text"
                                  value={condition}
                                  onChange={(e) => handleArrayFieldChange('emergencyInfo.criticalConditions', index, e.target.value)}
                                  placeholder="Enter medical condition"
                                  className={styles.editInput}
                                />
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('emergencyInfo.criticalConditions', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('emergencyInfo.criticalConditions', '')}
                            >
                              Add Condition
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.emergencyInfo?.criticalConditions || []).length > 0 ? (
                              <div className={styles.conditionsGrid}>
                                {selectedPatient.emergencyInfo.criticalConditions.map((condition, index) => (
                                  <div key={index} className={styles.conditionCard}>
                                    <Warning className={styles.conditionIcon} />
                                    <span className={styles.conditionText}>{condition}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No conditions recorded</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Major Surgeries */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Major Surgeries</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.emergencyInfo?.majorSurgeries || []).map((surgery, index) => (
                              <div key={index} className={styles.arrayItem}>
                                <input
                                  type="text"
                                  value={surgery}
                                  onChange={(e) => handleArrayFieldChange('emergencyInfo.majorSurgeries', index, e.target.value)}
                                  placeholder="Enter surgery (e.g., Appendectomy - 2015)"
                                  className={styles.editInput}
                                />
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('emergencyInfo.majorSurgeries', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('emergencyInfo.majorSurgeries', '')}
                            >
                              Add Surgery
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.emergencyInfo?.majorSurgeries || []).length > 0 ? (
                              <div className={styles.surgeriesList}>
                                {selectedPatient.emergencyInfo.majorSurgeries.map((surgery, index) => (
                                  <div key={index} className={styles.surgeryItem}>
                                    <LocalHospital className={styles.surgeryIcon} />
                                    <span className={styles.surgeryText}>{surgery}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No surgeries recorded</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Critical Notes */}
                      <div className={styles.infoItem}>
                        <label>Critical Notes</label>
                        {isEditing ? (
                          <textarea
                            value={patientUpdateData.emergencyInfo?.criticalNotes || ''}
                            onChange={(e) => handleFieldChange('emergencyInfo.criticalNotes', e.target.value)}
                            placeholder="Enter critical medical notes"
                            rows={3}
                            className={styles.editTextarea}
                          />
                        ) : (
                          <div className={`${styles.readOnlyField} ${styles.criticalNotes}`}>
                            {selectedPatient.emergencyInfo?.criticalNotes || 'No critical notes'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Medical Information */}
                    <div className={styles.infoSection}>
                      <h4>Medical Information</h4>
                      
                      {/* Insurance */}
                      <div className={styles.subsectionTitle}>Insurance Information</div>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <label>Provider</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.medicalInfo?.insurance?.provider || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.insurance.provider', e.target.value)}
                              placeholder="Enter insurance provider"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.insurance?.provider || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Policy Number</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.medicalInfo?.insurance?.policyNumber || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.insurance.policyNumber', e.target.value)}
                              placeholder="Enter policy number"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.insurance?.policyNumber || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Coverage</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.medicalInfo?.insurance?.coverage || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.insurance.coverage', e.target.value)}
                              placeholder="Enter coverage details"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.insurance?.coverage || 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lifestyle */}
                      <div className={styles.subsectionTitle}>Lifestyle Information</div>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <label>Smoking</label>
                          {isEditing ? (
                            <select
                              value={patientUpdateData.medicalInfo?.lifestyle?.smoking || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.lifestyle.smoking', e.target.value)}
                              className={styles.editInput}
                            >
                              <option value="">Select</option>
                              <option value="Never">Never</option>
                              <option value="Former">Former</option>
                              <option value="Current">Current</option>
                            </select>
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.lifestyle?.smoking || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Alcohol</label>
                          {isEditing ? (
                            <select
                              value={patientUpdateData.medicalInfo?.lifestyle?.alcohol || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.lifestyle.alcohol', e.target.value)}
                              className={styles.editInput}
                            >
                              <option value="">Select</option>
                              <option value="Never">Never</option>
                              <option value="Occasional">Occasional</option>
                              <option value="Regular">Regular</option>
                            </select>
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.lifestyle?.alcohol || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Exercise</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.medicalInfo?.lifestyle?.exercise || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.lifestyle.exercise', e.target.value)}
                              placeholder="e.g., 3 times per week"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.lifestyle?.exercise || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Diet</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.medicalInfo?.lifestyle?.diet || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.lifestyle.diet', e.target.value)}
                              placeholder="e.g., Balanced, Vegetarian"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.lifestyle?.diet || 'Not set'}
                            </div>
                          )}
                        </div>
                        <div className={styles.infoItem}>
                          <label>Sleep</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={patientUpdateData.medicalInfo?.lifestyle?.sleep || ''}
                              onChange={(e) => handleFieldChange('medicalInfo.lifestyle.sleep', e.target.value)}
                              placeholder="e.g., 7 hours/night"
                              className={styles.editInput}
                            />
                          ) : (
                            <div className={styles.readOnlyField}>
                              {selectedPatient.medicalInfo?.lifestyle?.sleep || 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Immunizations */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Immunizations</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.medicalInfo?.immunizations || []).map((immunization, index) => (
                              <div key={index} className={styles.immunizationItem}>
                                <div className={styles.immunizationGrid}>
                                  <input
                                    type="text"
                                    value={immunization.vaccine || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.immunizations', index, 'vaccine', e.target.value)}
                                    placeholder="Vaccine name"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="date"
                                    value={immunization.date ? new Date(immunization.date).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.immunizations', index, 'date', e.target.value)}
                                    className={styles.editInput}
                                  />
                                  <select
                                    value={immunization.status || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.immunizations', index, 'status', e.target.value)}
                                    className={styles.editInput}
                                  >
                                    <option value="">Status</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Overdue">Overdue</option>
                                  </select>
                                </div>
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('medicalInfo.immunizations', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('medicalInfo.immunizations', {
                                vaccine: '',
                                date: '',
                                status: ''
                              })}
                            >
                              Add Immunization
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.medicalInfo?.immunizations || []).length > 0 ? (
                              <div className={styles.immunizationsGrid}>
                                {selectedPatient.medicalInfo.immunizations.map((immunization, index) => (
                                  <div key={index} className={styles.immunizationCard}>
                                    <HealthAndSafety className={styles.vaccineIcon} />
                                    <div className={styles.vaccineDetails}>
                                      <div className={styles.vaccineName}>{immunization.vaccine}</div>
                                      <div className={styles.vaccineInfo}>
                                        <span className={styles.vaccineDate}>
                                          {immunization.date ? new Date(immunization.date).toLocaleDateString() : 'No date'}
                                        </span>
                                        <span className={`${styles.vaccineStatus} ${styles[immunization.status?.toLowerCase()] || ''}`}>
                                          {immunization.status || 'Unknown'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No immunizations recorded</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Medical Conditions */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Medical Conditions (Detailed)</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.medicalInfo?.medicalConditions || []).map((condition, index) => (
                              <div key={index} className={styles.conditionItem}>
                                <div className={styles.conditionGrid}>
                                  <input
                                    type="text"
                                    value={condition.condition || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medicalConditions', index, 'condition', e.target.value)}
                                    placeholder="Condition name"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="date"
                                    value={condition.diagnosedDate ? new Date(condition.diagnosedDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medicalConditions', index, 'diagnosedDate', e.target.value)}
                                    className={styles.editInput}
                                  />
                                  <select
                                    value={condition.status || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medicalConditions', index, 'status', e.target.value)}
                                    className={styles.editInput}
                                  >
                                    <option value="">Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Controlled">Controlled</option>
                                    <option value="Resolved">Resolved</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={condition.treatment || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medicalConditions', index, 'treatment', e.target.value)}
                                    placeholder="Treatment"
                                    className={styles.editInput}
                                  />
                                </div>
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('medicalInfo.medicalConditions', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('medicalInfo.medicalConditions', {
                                condition: '',
                                diagnosedDate: '',
                                status: '',
                                treatment: ''
                              })}
                            >
                              Add Condition
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.medicalInfo?.medicalConditions || []).length > 0 ? (
                              <div className={styles.medicalConditionsList}>
                                {selectedPatient.medicalInfo.medicalConditions.map((condition, index) => (
                                  <div key={index} className={styles.medicalConditionCard}>
                                    <div className={styles.conditionHeader}>
                                      <span className={styles.conditionName}>{condition.condition}</span>
                                      <span className={`${styles.conditionStatus} ${styles[condition.status?.toLowerCase()] || ''}`}>
                                        {condition.status || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className={styles.conditionDetails}>
                                      {condition.diagnosedDate && (
                                        <div className={styles.conditionField}>
                                          <span className={styles.conditionLabel}>Diagnosed:</span>
                                          <span className={styles.conditionValue}>
                                            {new Date(condition.diagnosedDate).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                      {condition.treatment && (
                                        <div className={styles.conditionField}>
                                          <span className={styles.conditionLabel}>Treatment:</span>
                                          <span className={styles.conditionValue}>{condition.treatment}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No medical conditions recorded</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Medications (Detailed) */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Medications (Detailed)</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.medicalInfo?.medications || []).map((medication, index) => (
                              <div key={index} className={styles.medicationItem}>
                                <div className={styles.medicationGrid}>
                                  <input
                                    type="text"
                                    value={medication.name || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medications', index, 'name', e.target.value)}
                                    placeholder="Medication name"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="text"
                                    value={medication.dosage || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medications', index, 'dosage', e.target.value)}
                                    placeholder="Dosage (e.g., 500mg)"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="text"
                                    value={medication.frequency || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medications', index, 'frequency', e.target.value)}
                                    placeholder="Frequency (e.g., Twice daily)"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="date"
                                    value={medication.startDate ? new Date(medication.startDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medications', index, 'startDate', e.target.value)}
                                    placeholder="Start date"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="date"
                                    value={medication.endDate ? new Date(medication.endDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medications', index, 'endDate', e.target.value)}
                                    placeholder="End date (optional)"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="text"
                                    value={medication.prescribedBy || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.medications', index, 'prescribedBy', e.target.value)}
                                    placeholder="Prescribed by"
                                    className={styles.editInput}
                                  />
                                </div>
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('medicalInfo.medications', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('medicalInfo.medications', {
                                name: '',
                                dosage: '',
                                frequency: '',
                                startDate: '',
                                endDate: null,
                                prescribedBy: ''
                              })}
                            >
                              Add Medication
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.medicalInfo?.medications || []).length > 0 ? (
                              <div className={styles.detailedMedicationsList}>
                                {selectedPatient.medicalInfo.medications.map((medication, index) => (
                                  <div key={index} className={styles.detailedMedicationCard}>
                                    <div className={styles.medicationHeader}>
                                      <span className={styles.medicationName}>{medication.name}</span>
                                      <span className={styles.medicationDosage}>{medication.dosage}</span>
                                    </div>
                                    <div className={styles.medicationDetails}>
                                      <div className={styles.medicationField}>
                                        <span className={styles.medicationLabel}>Frequency:</span>
                                        <span className={styles.medicationValue}>{medication.frequency}</span>
                                      </div>
                                      <div className={styles.medicationField}>
                                        <span className={styles.medicationLabel}>Start Date:</span>
                                        <span className={styles.medicationValue}>
                                          {medication.startDate ? new Date(medication.startDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                      </div>
                                      {medication.endDate && (
                                        <div className={styles.medicationField}>
                                          <span className={styles.medicationLabel}>End Date:</span>
                                          <span className={styles.medicationValue}>
                                            {new Date(medication.endDate).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                      {medication.prescribedBy && (
                                        <div className={styles.medicationField}>
                                          <span className={styles.medicationLabel}>Prescribed By:</span>
                                          <span className={styles.medicationValue}>{medication.prescribedBy}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No detailed medications recorded</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Family Medical History */}
                      <div className={styles.arraySection}>
                        <h5 className={styles.arraySectionTitle}>Family Medical History</h5>
                        {isEditing ? (
                          <div className={styles.arrayItems}>
                            {(patientUpdateData.medicalInfo?.familyMedicalHistory || []).map((history, index) => (
                              <div key={index} className={styles.familyHistoryItem}>
                                <div className={styles.familyHistoryGrid}>
                                  <input
                                    type="text"
                                    value={history.relation || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.familyMedicalHistory', index, 'relation', e.target.value)}
                                    placeholder="Relation (e.g., Father)"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="text"
                                    value={history.condition || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.familyMedicalHistory', index, 'condition', e.target.value)}
                                    placeholder="Condition"
                                    className={styles.editInput}
                                  />
                                  <input
                                    type="number"
                                    value={history.ageDiagnosed || ''}
                                    onChange={(e) => handleNestedArrayFieldChange('medicalInfo.familyMedicalHistory', index, 'ageDiagnosed', e.target.value)}
                                    placeholder="Age diagnosed"
                                    className={styles.editInput}
                                  />
                                </div>
                                <button 
                                  type="button"
                                  className={styles.removeItemBtn}
                                  onClick={() => removeArrayItem('medicalInfo.familyMedicalHistory', index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              className={styles.addItemBtn}
                              onClick={() => addArrayItem('medicalInfo.familyMedicalHistory', {
                                relation: '',
                                condition: '',
                                ageDiagnosed: ''
                              })}
                            >
                              Add Family History
                            </button>
                          </div>
                        ) : (
                          <div className={styles.arrayDisplay}>
                            {(selectedPatient.medicalInfo?.familyMedicalHistory || []).length > 0 ? (
                              <div className={styles.familyHistoryGrid}>
                                {selectedPatient.medicalInfo.familyMedicalHistory.map((history, index) => (
                                  <div key={index} className={styles.familyHistoryCard}>
                                    <div className={styles.familyRelation}>{history.relation}</div>
                                    <div className={styles.familyCondition}>{history.condition}</div>
                                    {history.ageDiagnosed && (
                                      <div className={styles.familyAge}>
                                        Diagnosed at age {history.ageDiagnosed}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.noData}>No family medical history recorded</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );

      case "analytics":
        return (
          <AnalyticsView medicId={user?.id} />
        );

      case "profile":
        return (
          <section className={styles.section}>
            <div className={styles.card}>
              <h2>My Profile</h2>
              <div className={styles.profileSection}>
                {medicProfile ? (
                  <div className={styles.profileContent}>
                    <div className={styles.profileHeader}>
                      <div className={styles.profileAvatar}>
                        {medicProfile.name?.charAt(0) || "D"}
                      </div>
                      <div className={styles.profileInfo}>
                        <h3>{medicProfile.name || "Dr. Unknown"}</h3>
                        <p>{medicProfile.specialization || "General Practitioner"}</p>
                        <span className={`${styles.verifiedBadge} ${medicProfile.verified ? styles.verified : styles.pending}`}>
                          {medicProfile.verified ? "Verified" : "Pending Verification"}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.profileDetails}>
                      <div className={styles.detailGroup}>
                        <h4>Contact Information</h4>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Email:</span>
                          <span className={styles.detailValue}>{medicProfile.email || "N/A"}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Phone:</span>
                          <span className={styles.detailValue}>{medicProfile.phone || "N/A"}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>License:</span>
                          <span className={styles.detailValue}>{medicProfile.licenseNumber || "N/A"}</span>
                        </div>
                      </div>
                      
                      <div className={styles.detailGroup}>
                        <h4>Account Information</h4>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Member Since:</span>
                          <span className={styles.detailValue}>
                            {new Date(medicProfile.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Last Updated:</span>
                          <span className={styles.detailValue}>
                            {new Date(medicProfile.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.profileActions}>
                      <button className={styles.editProfileBtn}>
                        Edit Profile
                      </button>
                      <button className={styles.changePasswordBtn}>
                        Change Password
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.profileLoading}>
                    <p>Loading profile information...</p>
                    <button className={styles.setupProfileBtn}>
                      Setup Your Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        );

      default:
        return (
          <section className={styles.section}>
            <div className={styles.card}>
              <h2>Page Not Found</h2>
              <p>The requested page is not available.</p>
            </div>
          </section>
        );
    }
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Dashboard },
    { id: "scan", label: "Scan QR", icon: QrCode },
    { id: "search", label: "Search Patient", icon: Search },
    { id: "analytics", label: "Analytics", icon: Analytics },
    { id: "profile", label: "My Profile", icon: Person },
  ];

  return (
    <div className={styles.dashboard}>
      <aside
        className={`
        ${styles.sidebar} 
        ${isMobile ? styles.sidebarMobile : ""}
        ${isMobileMenuOpen ? styles.sidebarMobileOpen : ""}
      `}
      >
        <div className={styles.sidebarHeader}>
          <FavoriteRounded style={{ color: '#ef4444', fontSize: '32px' }} />
          <h2 className={styles.logo}>MediSync</h2>
        </div>
        <nav>
          <ul>
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li
                  key={item.id}
                  className={activeTab === item.id ? styles.active : ""}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isMobile) setIsMobileMenuOpen(false);
                  }}
                >
                  <IconComponent />
                  {item.label}
                </li>
              );
            })}
            <li onClick={handleLogout} className={styles.logoutItem}>
              <Logout />
              Logout
            </li>
          </ul>
        </nav>
      </aside>

      <main
        className={`
        ${styles.main} 
        ${isMobile ? styles.mainMobile : ""}
        ${isMobileMenuOpen ? styles.mainWithMobileOpen : ""}
      `}
      >
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              {isMobile && (
                <button
                  className={styles.mobileMenuToggle}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu />
                </button>
              )}
              <div className={styles.headerAvatar}>
                {medicProfile?.profilePhoto || medicProfile?.photo ? (
                  <img 
                    src={
                      (medicProfile.profilePhoto || medicProfile.photo).startsWith('http') 
                        ? (medicProfile.profilePhoto || medicProfile.photo)
                        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${(medicProfile.profilePhoto || medicProfile.photo).startsWith('/') ? '' : '/'}${medicProfile.profilePhoto || medicProfile.photo}`
                    } 
                    alt={medicProfile?.name || "Doctor"} 
                    className={styles.headerAvatarImg}
                  />
                ) : (
                  <div className={styles.headerAvatarPlaceholder}>
                    {(medicProfile?.name || "Doctor").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1>
                  {navigationItems.find(item => item.id === activeTab)?.label || "Medic Dashboard"}
                </h1>
                <p>Welcome back, {medicProfile?.name || "Doctor"}</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.emergencyBtn}>
                <Emergency />
                Emergency
              </button>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {renderContent()}
        </div>

        {showPatientDetails && scannedPatient && !multiCasualtyMode && (
          <div className={styles.modalOverlay} onClick={handleCloseDetails}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Patient Medical Details</h3>
                <button className={styles.closeBtn} onClick={handleCloseDetails}>×</button>
              </div>
              
              <div className={styles.patientDetailsContent}>
                <EmergencyPatientView 
                  patientData={scannedPatient} 
                  isUnconscious={false}
                />
              </div>

              <div className={styles.modalActions}>
                <button className={styles.closeModalBtn} onClick={handleCloseDetails}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {isMobile && isMobileMenuOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      </main>
    </div>
  );
};

export default MedicDashboard;