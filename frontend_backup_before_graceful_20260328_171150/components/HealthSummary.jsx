import React from "react";
import {
  Favorite,
  Thermostat,
  Scale,
  Height,
  Assessment,
  Air,
  LocalHospital,
  Vaccines,
  FamilyRestroom,
  FitnessCenter,
  SmokingRooms,
  LocalBar,
  Restaurant,
  Bedtime,
  Warning,
  CheckCircle,
  MedicalServices,
} from "@mui/icons-material";
import styles from "./HealthSummary.module.css";

const HealthSummary = ({ patient = {} }) => {
  const getSeverityColor = (severity) => {
    if (!severity) return "#6b7280";
    switch (severity.toLowerCase()) {
      case "severe":
        return "#ef4444";
      case "moderate":
        return "#f59e0b";
      case "mild":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return styles.statusDefault;
    switch (status.toLowerCase()) {
      case "active":
      case "current":
      case "ongoing":
        return styles.statusActive;
      case "managed":
      case "stable":
      case "completed":
        return styles.statusManaged;
      case "resolved":
      case "cured":
        return styles.statusResolved;
      default:
        return styles.statusDefault;
    }
  };

  return (
    <div className={styles.healthSummary}>
      {/* Quick Stats Grid */}
      <div className={styles.quickStatsGrid}>
        <div className={styles.quickStat}>
          <div className={styles.quickStatIcon} style={{ backgroundColor: '#dbeafe' }}>
            <LocalHospital style={{ color: '#3b82f6', fontSize: '28px' }} />
          </div>
          <div className={styles.quickStatContent}>
            <span className={styles.quickStatValue}>
              {patient?.medicalInfo?.medicalConditions?.length || 0}
            </span>
            <span className={styles.quickStatLabel}>Conditions</span>
          </div>
        </div>

        <div className={styles.quickStat}>
          <div className={styles.quickStatIcon} style={{ backgroundColor: '#dcfce7' }}>
            <Vaccines style={{ color: '#10b981', fontSize: '28px' }} />
          </div>
          <div className={styles.quickStatContent}>
            <span className={styles.quickStatValue}>
              {patient?.medicalInfo?.immunizations?.length || 0}
            </span>
            <span className={styles.quickStatLabel}>Vaccines</span>
          </div>
        </div>

        <div className={styles.quickStat}>
          <div className={styles.quickStatIcon} style={{ backgroundColor: '#fef3c7' }}>
            <Warning style={{ color: '#f59e0b', fontSize: '28px' }} />
          </div>
          <div className={styles.quickStatContent}>
            <span className={styles.quickStatValue}>
              {patient?.emergencyInfo?.criticalAllergies?.length || 0}
            </span>
            <span className={styles.quickStatLabel}>Allergies</span>
          </div>
        </div>

        <div className={styles.quickStat}>
          <div className={styles.quickStatIcon} style={{ backgroundColor: '#fce7f3' }}>
            <FamilyRestroom style={{ color: '#ec4899', fontSize: '28px' }} />
          </div>
          <div className={styles.quickStatContent}>
            <span className={styles.quickStatValue}>
              {patient?.medicalInfo?.familyMedicalHistory?.length || 0}
            </span>
            <span className={styles.quickStatLabel}>Family History</span>
          </div>
        </div>
      </div>

      {/* Medical Conditions Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            <MedicalServices style={{ color: '#3b82f6', fontSize: '24px' }} />
            <h2 className={styles.sectionTitle}>Medical Conditions</h2>
          </div>
        </div>
        
        <div className={styles.cardsGrid}>
          {patient?.medicalInfo?.medicalConditions?.length > 0 ? (
            patient.medicalInfo.medicalConditions.map((condition, index) => (
              <div key={index} className={styles.conditionCard}>
                <div className={styles.conditionHeader}>
                  <h3 className={styles.conditionTitle}>{condition.condition}</h3>
                  <span className={getStatusBadgeClass(condition.status)}>
                    {condition.status || "Unknown"}
                  </span>
                </div>
                <div className={styles.conditionDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Diagnosed:</span>
                    <span className={styles.detailValue}>
                      {condition.diagnosedDate 
                        ? new Date(condition.diagnosedDate).toLocaleDateString() 
                        : "N/A"}
                    </span>
                  </div>
                  {condition.treatment && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Treatment:</span>
                      <span className={styles.detailValue}>{condition.treatment}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <CheckCircle style={{ fontSize: '48px', color: '#10b981' }} />
              <p className={styles.emptyText}>No medical conditions recorded</p>
              <span className={styles.emptySubtext}>This is a good sign!</span>
            </div>
          )}
        </div>
      </section>

      {/* Allergies Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            <Warning style={{ color: '#ef4444', fontSize: '24px' }} />
            <h2 className={styles.sectionTitle}>Allergies</h2>
          </div>
        </div>
        
        {patient?.emergencyInfo?.criticalAllergies?.length > 0 ? (
          <div className={styles.allergyGrid}>
            {patient.emergencyInfo.criticalAllergies.map((allergy, index) => (
              <div key={index} className={styles.allergyCard}>
                <Warning style={{ color: '#dc2626', fontSize: '20px' }} />
                <span className={styles.allergyText}>{allergy}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <CheckCircle style={{ fontSize: '48px', color: '#10b981' }} />
            <p className={styles.emptyText}>No allergies reported</p>
            <span className={styles.emptySubtext}>Great news!</span>
          </div>
        )}
      </section>

      {/* Immunizations Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            <Vaccines style={{ color: '#10b981', fontSize: '24px' }} />
            <h2 className={styles.sectionTitle}>Immunizations</h2>
          </div>
        </div>
        
        <div className={styles.cardsGrid}>
          {patient?.medicalInfo?.immunizations?.length > 0 ? (
            patient.medicalInfo.immunizations.map((vaccine, index) => (
              <div key={index} className={styles.vaccineCard}>
                <div className={styles.vaccineHeader}>
                  <Vaccines style={{ color: '#10b981', fontSize: '20px' }} />
                  <h3 className={styles.vaccineTitle}>{vaccine.vaccine}</h3>
                </div>
                <div className={styles.vaccineDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Date:</span>
                    <span className={styles.detailValue}>
                      {vaccine.date 
                        ? new Date(vaccine.date).toLocaleDateString() 
                        : "N/A"}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status:</span>
                    <span className={`${styles.detailValue} ${styles.vaccineStatus}`}>
                      {vaccine.status || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Vaccines style={{ fontSize: '48px', color: '#cbd5e1' }} />
              <p className={styles.emptyText}>No immunization records found</p>
              <span className={styles.emptySubtext}>Consider updating your vaccination records</span>
            </div>
          )}
        </div>
      </section>

      {/* Family Medical History Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            <FamilyRestroom style={{ color: '#ec4899', fontSize: '24px' }} />
            <h2 className={styles.sectionTitle}>Family Medical History</h2>
          </div>
        </div>
        
        <div className={styles.cardsGrid}>
          {patient?.medicalInfo?.familyMedicalHistory?.length > 0 ? (
            patient.medicalInfo.familyMedicalHistory.map((history, index) => (
              <div key={index} className={styles.historyCard}>
                <div className={styles.historyHeader}>
                  <FamilyRestroom style={{ color: '#ec4899', fontSize: '20px' }} />
                  <span className={styles.relationBadge}>{history.relation || "N/A"}</span>
                </div>
                <div className={styles.historyDetails}>
                  <h4 className={styles.historyCondition}>{history.condition || "N/A"}</h4>
                  {history.ageDiagnosed && (
                    <span className={styles.historyAge}>
                      Diagnosed at age {history.ageDiagnosed}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <FamilyRestroom style={{ fontSize: '48px', color: '#cbd5e1' }} />
              <p className={styles.emptyText}>No family medical history available</p>
              <span className={styles.emptySubtext}>Add family history for better health insights</span>
            </div>
          )}
        </div>
      </section>

      {/* Lifestyle Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrapper}>
            <FitnessCenter style={{ color: '#8b5cf6', fontSize: '24px' }} />
            <h2 className={styles.sectionTitle}>Lifestyle & Habits</h2>
          </div>
        </div>
        
        <div className={styles.lifestyleGrid}>
          <div className={styles.lifestyleCard}>
            <div className={styles.lifestyleIcon} style={{ backgroundColor: '#fee2e2' }}>
              <SmokingRooms style={{ color: '#dc2626', fontSize: '24px' }} />
            </div>
            <div className={styles.lifestyleContent}>
              <span className={styles.lifestyleLabel}>Smoking</span>
              <span className={styles.lifestyleValue}>
                {patient?.medicalInfo?.lifestyle?.smoking || "Not specified"}
              </span>
            </div>
          </div>

          <div className={styles.lifestyleCard}>
            <div className={styles.lifestyleIcon} style={{ backgroundColor: '#fef3c7' }}>
              <LocalBar style={{ color: '#d97706', fontSize: '24px' }} />
            </div>
            <div className={styles.lifestyleContent}>
              <span className={styles.lifestyleLabel}>Alcohol</span>
              <span className={styles.lifestyleValue}>
                {patient?.medicalInfo?.lifestyle?.alcohol || "Not specified"}
              </span>
            </div>
          </div>

          <div className={styles.lifestyleCard}>
            <div className={styles.lifestyleIcon} style={{ backgroundColor: '#dcfce7' }}>
              <FitnessCenter style={{ color: '#059669', fontSize: '24px' }} />
            </div>
            <div className={styles.lifestyleContent}>
              <span className={styles.lifestyleLabel}>Exercise</span>
              <span className={styles.lifestyleValue}>
                {patient?.medicalInfo?.lifestyle?.exercise || "Not specified"}
              </span>
            </div>
          </div>

          <div className={styles.lifestyleCard}>
            <div className={styles.lifestyleIcon} style={{ backgroundColor: '#dbeafe' }}>
              <Restaurant style={{ color: '#2563eb', fontSize: '24px' }} />
            </div>
            <div className={styles.lifestyleContent}>
              <span className={styles.lifestyleLabel}>Diet</span>
              <span className={styles.lifestyleValue}>
                {patient?.medicalInfo?.lifestyle?.diet || "Not specified"}
              </span>
            </div>
          </div>

          <div className={styles.lifestyleCard}>
            <div className={styles.lifestyleIcon} style={{ backgroundColor: '#e0e7ff' }}>
              <Bedtime style={{ color: '#6366f1', fontSize: '24px' }} />
            </div>
            <div className={styles.lifestyleContent}>
              <span className={styles.lifestyleLabel}>Sleep</span>
              <span className={styles.lifestyleValue}>
                {patient?.medicalInfo?.lifestyle?.sleep || "Not specified"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HealthSummary;