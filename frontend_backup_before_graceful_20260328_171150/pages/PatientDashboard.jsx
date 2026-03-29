import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setIsMobile } from "../store/mobileSlice";
import { supabase } from "../utils/supabaseClient";
import apiClient from "../config/apiClient";
import styles from "./PatientDashboard.module.css";
import HealthSummary from "../components/HealthSummary";
import EditableHealthVitals from "../components/EditableHealthVitals";
import EditableBasicInfo from "../components/EditableBasicInfo";
import RecentVisits from "../components/RecentVisits";
import Medications from "../components/Medications";
import EmergencyContacts from "../components/EmergencyContacts";
import EditableEmergencyContacts from "../components/EditableEmergencyContacts";
import HealthIDCard from "../components/HealthIDCard";
import {
  Dashboard,
  Person,
  LocalHospital,
  Medication,
  ContactPhone,
  QrCode,
  ExitToApp,
  Menu,
  FavoriteRounded,
  Download,
  Print,
  Refresh,
  TrendingUp,
  Warning,
  Bloodtype,
  Phone,
  Email,
  CheckCircle,
  Save,
  Share,
  Print as PrintIcon,
  Update,
  Info,
  LocalHospital as HospitalIcon,
  PhotoCamera,
} from "@mui/icons-material";

const PatientDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const isMobile = useSelector((state) => state.mobile.isMobile);
  const dispatch = useDispatch();

  const [patient, setPatient] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrData, setQrData] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortControllerRef = useRef(null);
  // Initialize activeTab from localStorage or URL params, default to dashboard
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl) {
      return tabFromUrl;
    }
    const savedTab = localStorage.getItem('patientDashboard_activeTab');
    return savedTab || "dashboard";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  // Save activeTab to localStorage and URL when it changes
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('patientDashboard_activeTab', activeTab);
      const url = new URL(window.location);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url);
    }
  }, [activeTab]);

  // Get real vitals from patient data
  const getVitals = () => {
    const vitals = patient?.medicalInfo?.healthVitals || {};
    return {
      bloodPressure: vitals.bloodPressure || null,
      heartRate: vitals.heartRate || null,
      weight: vitals.weight || null,
      bmi: vitals.bmi || null,
    };
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/patients/${user?.id}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-id': user?.id,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload photo');
      }

      // Refresh patient data to show new photo
      await fetchPatientData();
      alert('Photo updated successfully!');
    } catch (err) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 🔹 Fetch all patient data - moved outside useEffect so it can be used by components
  const fetchPatientData = async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    try {
      if (!user?.id) throw new Error("No user found. Please log in.");

      const authId = user.id;
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Fetch patient - if not found, user should be redirected to welcome setup
      const patientData = await apiClient.get(`/api/patients/${authId}`, { 
        signal, 
        authId 
      });
      
      setPatient(patientData.data);

      const patientId = patientData.data?._id;

      // ✅ Emergency Contacts - check both EmergencyContact model and patient.emergencyInfo
      let allContacts = [];
      
      // First, try to fetch from EmergencyContact model
      if (patientId) {
        try {
          const contactsData = await apiClient.get(`/api/emergency-contacts/${patientId}`, { 
            signal, 
            authId 
          });
          if (contactsData.contacts && Array.isArray(contactsData.contacts)) {
            allContacts = contactsData.contacts;
          }
        } catch {
          // If EmergencyContact model doesn't have contacts, check patient.emergencyInfo
        }
      }
      
      // Also check patient.emergencyInfo.primaryEmergencyContacts
      if (patientData.data?.emergencyInfo?.primaryEmergencyContacts && 
          Array.isArray(patientData.data.emergencyInfo.primaryEmergencyContacts)) {
        // Merge with existing contacts, avoiding duplicates
        const patientContacts = patientData.data.emergencyInfo.primaryEmergencyContacts;
        patientContacts.forEach(pc => {
          // Check if contact already exists (by phone)
          if (!allContacts.find(c => c.phone === pc.phone)) {
            allContacts.push({
              name: pc.name,
              relationship: pc.relation || pc.relationship,
              phone: pc.phone,
              email: pc.email,
              address: pc.address,
              isPrimary: pc.isPrimary || false,
            });
          }
        });
      }
      
      setEmergencyContacts(allContacts);

      // ✅ Medications
      if (patientData.data?.medicalInfo?.medications && Array.isArray(patientData.data.medicalInfo.medications)) {
        setMedications(patientData.data.medicalInfo.medications);
      } else {
        setMedications([]);
      }

      // ✅ QR Code Image
      try {
        const blob = await apiClient.get(`/api/qr/${authId}`, { 
          signal, 
          authId
        });
        
        if (blob && blob.size > 0) {
          const qrBlobUrl = URL.createObjectURL(blob);
          setQrUrl(qrBlobUrl);
        } else {
          setQrUrl(null);
        }
      } catch {
        setQrUrl(null);
      }

      // ✅ QR Data for Display (from QR routes)
      try {
        const qrDataResponse = await apiClient.get(`/api/qr/data/${authId}`, { 
          signal, 
          authId 
        });
        setQrData(qrDataResponse.data);
      } catch {
        setQrData(null);
      }

      // ✅ Medical Records
      try {
        const recordData = await apiClient.get(`/api/records/patient/${authId}`, { 
          signal, 
          authId 
        });
        setMedicalRecords(recordData.data);
      } catch {
        setMedicalRecords([]);
      }


      setLoading(false);
    } catch (err) {
      // Don't show error for cancelled requests (component unmounting)
      if (err.name === 'AbortError' || (err.message && err.message.includes('cancelled'))) {
        return; // Silently ignore cancelled requests
      }
      console.error("❌ Error fetching patient dashboard:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // 🔹 Fetch patient data on component mount
  useEffect(() => {
    fetchPatientData();
    
    // Cleanup: cancel ongoing requests on unmount or when user changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id]); // Only depend on user.id, not entire user object

  // Refresh QR data function
  const refreshQRData = async () => {
    try {
      const authId = user.id;

      // Refresh QR image
      try {
        const blob = await apiClient.get(`/api/qr/${authId}`, { 
          authId
        });
        
        if (blob && blob.size > 0) {
          if (qrUrl) URL.revokeObjectURL(qrUrl);
          const newQrUrl = URL.createObjectURL(blob);
          setQrUrl(newQrUrl);
        }
      } catch {
        // QR image refresh failed, keep existing
      }

      // Refresh QR display data
      try {
        const qrDataResponse = await apiClient.get(`/api/qr/data/${authId}`, { authId });
        setQrData(qrDataResponse.data);
      } catch {
        // QR data refresh failed, keep existing
      }
    } catch (error) {
      console.error('Error refreshing QR:', error);
    }
  };

  if (loading) return <p className={styles.loading}>Loading patient dashboard...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: Dashboard },
    { id: "profile", label: "My Profile", icon: Person },
    { id: "visits", label: "Medical Visits", icon: LocalHospital },
    { id: "medications", label: "Medications", icon: Medication },
    { id: "contacts", label: "Emergency Contacts", icon: ContactPhone },
    { id: "qr", label: "My QR Code", icon: QrCode },
  ];

  const StatCard = ({ icon: Icon, label, value, action, color }) => (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ backgroundColor: color + '20' }}>
        <Icon style={{ color: color, fontSize: '32px' }} />
      </div>
      <div className={styles.statContent}>
        <h3 className={styles.statValue}>{value}</h3>
        <p className={styles.statLabel}>{label}</p>
        <button className={styles.statButton} onClick={action}>
          View Details
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            {/* Welcome Section */}
            <section className={styles.section}>
              <div className={styles.welcomeCard}>
                <div className={styles.welcomeContent}>
                  <div>
                    <h2>Welcome back, {patient?.basicInfo?.fullName || "Patient"}!</h2>
                    <p>Here's your health overview and quick access to your medical information</p>
                  </div>
                  <div className={styles.welcomeStats}>
                    <div className={styles.statBadge}>
                      <TrendingUp />
                      <span>Health Status: Good</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats Grid */}
            <section className={styles.section}>
              <div className={styles.statsGrid}>
                <StatCard
                  icon={LocalHospital}
                  label="Medical Records"
                  value={medicalRecords.length}
                  action={() => setActiveTab("visits")}
                  color="#3b82f6"
                />
                <StatCard
                  icon={Medication}
                  label="Active Medications"
                  value={medications.length}
                  action={() => setActiveTab("medications")}
                  color="#10b981"
                />
                <StatCard
                  icon={ContactPhone}
                  label="Emergency Contacts"
                  value={emergencyContacts.length}
                  action={() => setActiveTab("contacts")}
                  color="#ef4444"
                />
              </div>
            </section>

            {/* QR Code Highlight Section */}
            <section className={styles.section}>
              <div className={styles.qrHighlightCard}>
                <div className={styles.qrHighlightContent}>
                  <div className={styles.qrHighlightLeft}>
                    <div className={styles.qrHighlightIcon}>
                      <QrCode style={{ fontSize: '48px' }} />
                    </div>
                    <div className={styles.qrHighlightText}>
                      <h3>Your Medical ID QR Code</h3>
                      <p>Quick access to your essential health data for emergencies</p>
                    </div>
                  </div>
                  <button
                    className={styles.qrHighlightButton}
                    onClick={() => setActiveTab("qr")}
                  >
                    <QrCode />
                    View My QR Code
                  </button>
                </div>
              </div>
            </section>

            {/* Quick Overview Cards */}
            <section className={styles.section}>
              <div className={styles.twoColumnGrid}>
                {/* Health Summary Preview */}
                <div className={styles.card}>
                  <EditableHealthVitals 
                    vitals={getVitals()}
                    patientAuthId={user?.id}
                    patientHeight={patient?.basicInfo?.height}
                    onUpdate={fetchPatientData}
                  />
                  <button 
                    className={styles.viewAllBtn}
                    onClick={() => setActiveTab("profile")}
                  >
                    View Full Profile
                  </button>
                </div>

                {/* Recent Activity */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.sectionTitle}>
                      <Warning style={{ marginRight: '8px', color: '#f59e0b' }} />
                      Critical Information
                    </h3>
                  </div>
                  <div className={styles.criticalInfo}>
                    {patient?.emergencyInfo?.criticalAllergies?.length > 0 ? (
                      <div className={styles.criticalSection}>
                        <span className={styles.criticalLabel}>Allergies:</span>
                        <div className={styles.allergyTags}>
                          {patient.emergencyInfo.criticalAllergies.map((allergy, index) => (
                            <span key={index} className={styles.allergyTag}>
                              {allergy}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className={styles.noData}>No allergies recorded</p>
                    )}
                    {patient?.emergencyInfo?.criticalConditions?.length > 0 && (
                      <div className={styles.criticalSection}>
                        <span className={styles.criticalLabel}>Conditions:</span>
                        <div className={styles.conditionTags}>
                          {patient.emergencyInfo.criticalConditions.map((condition, index) => (
                            <span key={index} className={styles.conditionTag}>
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    className={styles.viewAllBtn}
                    onClick={() => setActiveTab("profile")}
                  >
                    View Emergency Info
                  </button>
                </div>
              </div>
            </section>

          </>
        );

      case "profile":
        return (
          <div className={styles.profileTabContainer}>
            {/* Profile Summary Section - Top Most */}
            <div className={styles.profileSummaryCard}>
              <div className={styles.profileSummaryContent}>
                <div className={styles.profileSummaryPhotoContainer}>
                  <div className={styles.profileSummaryPhoto}>
                    {patient?.basicInfo?.profilePhoto ? (
                      <img 
                        src={
                          patient.basicInfo.profilePhoto.startsWith('http') 
                            ? patient.basicInfo.profilePhoto 
                            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${patient.basicInfo.profilePhoto.startsWith('/') ? '' : '/'}${patient.basicInfo.profilePhoto}`
                        } 
                        alt={patient?.basicInfo?.fullName || "Patient"} 
                        className={styles.profileSummaryImg}
                      />
                    ) : (
                      <div className={styles.profileSummaryPlaceholder}>
                        <Person style={{ fontSize: '64px', color: '#94a3b8' }} />
                      </div>
                    )}
                  </div>
                  <label className={styles.photoUploadLabel}>
                    <PhotoCamera style={{ fontSize: '18px', marginRight: '6px' }} />
                    {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <div className={styles.profileSummaryInfo}>
                  <h2 className={styles.profileSummaryName}>
                    {patient?.basicInfo?.fullName || "Patient Name"}
                  </h2>
                  <div className={styles.profileSummaryMeta}>
                    <span className={styles.profileSummaryMetaItem}>
                      {patient?.basicInfo?.age || "N/A"} years old
                    </span>
                    <span className={styles.profileSummarySeparator}>•</span>
                    <span className={styles.profileSummaryMetaItem}>
                      {patient?.basicInfo?.gender || "N/A"}
                    </span>
                    <span className={styles.profileSummarySeparator}>•</span>
                    <span className={styles.profileSummaryMetaItem}>
                      <Bloodtype style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '4px' }} />
                      {patient?.basicInfo?.bloodGroup || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.profileContentGrid}>
              <div className={styles.profileContentLeft}>
                <EditableBasicInfo 
                  patient={patient}
                  patientAuthId={user?.id}
                  onUpdate={fetchPatientData}
                />
                <EditableHealthVitals 
                  vitals={getVitals()}
                  patientAuthId={user?.id}
                  patientHeight={patient?.basicInfo?.height}
                  onUpdate={fetchPatientData}
                />
              </div>
              <div className={styles.profileContentRight}>
                <HealthSummary
                  patient={patient}
                  medicalConditions={patient?.medicalInfo?.medicalConditions || []}
                  immunizations={patient?.medicalInfo?.immunizations || []}
                  allergies={patient?.emergencyInfo?.criticalAllergies || []}
                  familyHistory={patient?.medicalInfo?.familyMedicalHistory || []}
                  lifestyle={patient?.medicalInfo?.lifestyle || {}}
                />
              </div>
            </div>
          </div>
        );

      case "visits":
        return <RecentVisits visits={medicalRecords} />;

      case "medications":
        return <Medications medications={medications} patient={patient} />;


      case "contacts":
        return (
          <EditableEmergencyContacts
            contacts={emergencyContacts}
            patientId={patient?._id}
            patientAuthId={user?.id}
            onUpdate={fetchPatientData}
          />
        );

      case "qr":
        return (
          <div className={styles.qrTabContent}>
            {/* Emergency Digital Health ID Card Section */}
            {patient && (
              <div className={styles.card} style={{ marginBottom: '30px' }}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.sectionTitle}>Emergency Digital Health ID Card</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                    Download your official medical ID card for emergency situations
                  </p>
                </div>
                <HealthIDCard patient={patient} />
              </div>
            )}
            
            {/* QR Code Information Section - Additional details */}
            {qrUrl && qrData ? (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.sectionTitle}>QR Code Information</h3>
                </div>
                
                {/* Basic Info */}
                <div className={styles.qrBasicInfo}>
                  <div className={styles.qrInfoRow}>
                    <span className={styles.infoLabel}>
                      <Person style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle' }} />
                      Patient:
                    </span>
                    <span className={styles.infoValue}>
                      {qrData.basicInfo?.fullName || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.qrInfoRow}>
                    <span className={styles.infoLabel}>
                      <Bloodtype style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle' }} />
                      Blood Group:
                    </span>
                    <span className={styles.infoValue}>
                      {qrData.basicInfo?.bloodGroup || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.qrInfoRow}>
                    <span className={styles.infoLabel}>Age:</span>
                    <span className={styles.infoValue}>
                      {qrData.basicInfo?.age || 'N/A'}
                    </span>
                  </div>
                  {qrData.basicInfo?.contact?.phone && (
                    <div className={styles.qrInfoRow}>
                      <span className={styles.infoLabel}>
                        <Phone style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle' }} />
                        Phone:
                      </span>
                      <span className={styles.infoValue}>
                        {qrData.basicInfo.contact.phone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
               {/* QR Image Preview */}
              {qrUrl && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <img
                    src={qrUrl}
                    alt="Medical QR Code"
                    style={{ width: 180, height: 180, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  />
                </div>
              )}
                <div className={styles.qrActions}>
                  <button 
                    className={`${styles.qrActionBtn} ${styles.downloadBtn}`}
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrUrl;
                      link.download = `medical-qr-${qrData.basicInfo?.fullName || 'patient'}.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download />
                    <span>Download QR Image</span>
                  </button>
                  
                  <button 
                    className={`${styles.qrActionBtn} ${styles.refreshBtn}`}
                    onClick={refreshQRData}
                  >
                    <Refresh />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Emergency Information Section */}
                <div className={styles.qrInfoSection}>
                  <h3 className={styles.infoSectionTitle}>
                    <Warning style={{ fontSize: '24px', marginRight: '10px', verticalAlign: 'middle', color: '#ef4444' }} />
                    Emergency Information
                  </h3>
                  <div className={styles.emergencyGrid}>
                    {qrData.emergencyInfo?.criticalAllergies?.length > 0 && (
                        <div className={styles.infoCard}>
                          <span className={styles.infoCardLabel}>
                            <Warning style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                            Critical Allergies
                          </span>
                          <div className={styles.infoTagList}>
                            {qrData.emergencyInfo.criticalAllergies.map((allergy, index) => (
                              <span key={index} className={styles.allergyInfoTag}>
                                {allergy}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {qrData.emergencyInfo?.currentMedications?.length > 0 && (
                        <div className={styles.infoCard}>
                          <span className={styles.infoCardLabel}>
                            <Medication style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                            Current Medications
                          </span>
                          <div className={styles.infoTagList}>
                            {qrData.emergencyInfo.currentMedications.map((med, index) => (
                              <span key={index} className={styles.medicationInfoTag}>
                                {med}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {qrData.emergencyInfo?.criticalConditions?.length > 0 && (
                        <div className={styles.infoCard}>
                          <span className={styles.infoCardLabel}>
                            <LocalHospital style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                            Medical Conditions
                          </span>
                          <div className={styles.infoTagList}>
                            {qrData.emergencyInfo.criticalConditions.map((condition, index) => (
                              <span key={index} className={styles.conditionInfoTag}>
                                {condition}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {qrData.emergencyInfo?.criticalNotes && (
                        <div className={styles.infoCard}>
                          <span className={styles.infoCardLabel}>
                            <Info style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                            Important Notes
                          </span>
                          <p className={styles.criticalNotesText}>
                            {qrData.emergencyInfo.criticalNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  {qrData.emergencyInfo?.primaryEmergencyContacts?.length > 0 && (
                    <div className={styles.qrInfoSection}>
                      <h3 className={styles.infoSectionTitle}>
                        <ContactPhone style={{ fontSize: '24px', marginRight: '10px', verticalAlign: 'middle', color: '#3b82f6' }} />
                        Emergency Contacts
                      </h3>
                      <div className={styles.contactsGrid}>
                        {qrData.emergencyInfo.primaryEmergencyContacts.map((contact, index) => (
                          <div key={index} className={styles.emergencyContactCard}>
                            <div className={styles.contactCardHeader}>
                              <span className={styles.contactCardName}>
                                {contact.name}
                              </span>
                              {contact.isPrimary && (
                                <span className={styles.primaryContactBadge}>Primary</span>
                              )}
                            </div>
                            <span className={styles.contactRelation}>{contact.relation}</span>
                            <div className={styles.contactCardDetails}>
                              <span className={styles.contactPhone}>
                                <Phone style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                                {contact.phone}
                              </span>
                              {contact.email && (
                                <span className={styles.contactEmail}>
                                  <Email style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                                  {contact.email}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
      
                  {/* Instructions */}
                  <div className={styles.instructionsCard}>
                    <h3>
                      <Info style={{ fontSize: '20px', marginRight: '8px', verticalAlign: 'middle' }} />
                      How to Use Your Medical QR Code:
                    </h3>
                    <ul className={styles.instructionList}>
                      <li>
                        <Save style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} />
                        Save to your phone's photos for quick access
                      </li>
                      <li>
                        <PrintIcon style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} />
                        Print and keep in your wallet or car
                      </li>
                      <li>
                        <Share style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} />
                        Share with family members and caregivers
                      </li>
                      <li>
                        <HospitalIcon style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} />
                        Show to medical staff during emergencies
                      </li>
                      <li>
                        <Update style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle', color: '#10b981' }} />
                        Update regularly when medical information changes
                      </li>
                    </ul>
                  </div>

                  {/* QR Metadata */}
                  <div className={styles.metadataCard}>
                    <h3>
                      <QrCode style={{ fontSize: '20px', marginRight: '8px', verticalAlign: 'middle' }} />
                      QR Code Information
                    </h3>
                    <div className={styles.metadataGrid}>
                      <div className={styles.metadataItem}>
                        <span className={styles.metadataLabel}>QR Code ID:</span>
                        <span className={styles.metadataValue}>
                          {qrData.qrMetadata?.qrCodeId || 'Not assigned'}
                        </span>
                      </div>
                      <div className={styles.metadataItem}>
                        <span className={styles.metadataLabel}>Issued:</span>
                        <span className={styles.metadataValue}>
                          {qrData.qrMetadata?.issuedAt ? 
                            new Date(qrData.qrMetadata.issuedAt).toLocaleDateString() : 
                            new Date().toLocaleDateString()
                          }
                        </span>
                      </div>
                      <div className={styles.metadataItem}>
                        <span className={styles.metadataLabel}>Health ID:</span>
                        <span className={styles.metadataValue}>
                          {patient?.healthId || qrData.systemInfo?.healthId || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
            ) : null}
          </div>
        );

      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${isMobile ? styles.sidebarMobile : ""} ${
          isMobileMenuOpen ? styles.sidebarMobileOpen : ""
        }`}
      >
        <div className={styles.sidebarHeader}>
          <FavoriteRounded style={{ color: '#ef4444', fontSize: '32px' }} />
          <h2 className={styles.logo}>HealthSync</h2>
        </div>

        <nav className={styles.navigation}>
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${
                  activeTab === item.id ? styles.active : ""
                }`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
              >
                <IconComponent />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        
      </aside>

      {/* Main Content */}
      <main
        className={`${styles.main} ${isMobile ? styles.mainMobile : ""} ${
          isMobileMenuOpen ? styles.mainWithMobileOpen : ""
        }`}
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
                {patient?.basicInfo?.profilePhoto ? (
                  <img 
                    src={
                      patient.basicInfo.profilePhoto.startsWith('http') 
                        ? patient.basicInfo.profilePhoto 
                        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${patient.basicInfo.profilePhoto.startsWith('/') ? '' : '/'}${patient.basicInfo.profilePhoto}`
                    } 
                    alt={patient?.basicInfo?.fullName || "Patient"} 
                    className={styles.headerAvatarImg}
                  />
                ) : (
                  <div className={styles.headerAvatarPlaceholder}>
                    {(patient?.basicInfo?.fullName || "Patient").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1>
                  {
                    navigationItems.find((item) => item.id === activeTab)
                      ?.label || "Dashboard"
                  }
                </h1>
                <p>Welcome back, {patient?.basicInfo?.fullName || "Patient"}</p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <div className={styles.patientInfo}>
                <span className={styles.patientName}>
                  {patient?.basicInfo?.fullName || "Patient Name"}
                </span>
                <span className={styles.patientId}>
                  Health ID: {patient?.healthId || "N/A"}
                </span>
              </div>

              <button
                className={styles.logoutBtn}
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.signOut();
                    if (error) throw error;
                    localStorage.clear();
                    sessionStorage.clear();
                    dispatch({ type: "auth/logout" });
                    window.location.replace("/login");
                  } catch (err) {
                    console.error("Logout failed:", err.message);
                  }
                }}
              >
                <ExitToApp />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className={styles.content}>{renderContent()}</div>

        {isMobile && isMobileMenuOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;