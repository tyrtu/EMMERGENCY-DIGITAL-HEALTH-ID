import React from "react";
import styles from "./Medications.module.css";
import {
  CheckCircle,
  PauseCircle,
  Medication as MedicationIcon,
  LocalHospital,
  Person,
  AccessTime,
  CalendarToday,
  Info,
  Warning,
  Schedule,
  Bloodtype,
} from "@mui/icons-material";

const Medications = ({ medications = [], patient = {} }) => {
  // Get status configuration
  const getStatusConfig = (status) => {
    if (!status) return { color: "#6b7280", label: "Unknown", icon: MedicationIcon, className: styles.statusUnknown };
    
    switch (status.toLowerCase()) {
      case "active":
        return { 
          color: "#10b981", 
          label: "Active", 
          icon: CheckCircle,
          className: styles.statusActive 
        };
      case "completed":
        return { 
          color: "#6b7280", 
          label: "Completed", 
          icon: CheckCircle,
          className: styles.statusCompleted 
        };
      case "paused":
        return { 
          color: "#f59e0b", 
          label: "Paused", 
          icon: PauseCircle,
          className: styles.statusPaused 
        };
      default:
        return { 
          color: "#6b7280", 
          label: status, 
          icon: MedicationIcon,
          className: styles.statusUnknown 
        };
    }
  };

  // Count active medications
  const activeMeds = medications?.filter(med => med.status?.toLowerCase() === 'active').length || 0;
  const totalMeds = medications?.length || 0;

  return (
    <div className={styles.medicationsContainer}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <MedicationIcon style={{ color: '#8b5cf6', fontSize: '28px' }} />
          <div>
            <h2 className={styles.sectionTitle}>Medications</h2>
            <p className={styles.sectionSubtitle}>
              Current and past medication history
            </p>
          </div>
        </div>
        <div className={styles.medsCount}>
          <div className={styles.countItem}>
            <span className={styles.countNumber}>{activeMeds}</span>
            <span className={styles.countLabel}>Active</span>
          </div>
          <div className={styles.countDivider}></div>
          <div className={styles.countItem}>
            <span className={styles.countNumber}>{totalMeds}</span>
            <span className={styles.countLabel}>Total</span>
          </div>
        </div>
      </div>

      {/* Patient Info Card */}
      {patient?.basicInfo && (
        <div className={styles.patientInfoCard}>
          <div className={styles.patientHeader}>
            <div className={styles.patientAvatar}>
              <Person style={{ fontSize: '28px' }} />
            </div>
            <div className={styles.patientDetails}>
              <h3 className={styles.patientName}>
                {patient.basicInfo.fullName || "Unknown Patient"}
              </h3>
              <div className={styles.patientMeta}>
                <span className={styles.metaItem}>
                  <Bloodtype style={{ fontSize: '14px' }} />
                  {patient.basicInfo.bloodGroup || "N/A"}
                </span>
                <span className={styles.metaSeparator}>•</span>
                <span className={styles.metaItem}>
                  {patient.basicInfo.age || "N/A"} years
                </span>
                <span className={styles.metaSeparator}>•</span>
                <span className={styles.metaItem}>
                  Health ID: {patient.healthId || "N/A"}
                </span>
              </div>
            </div>
          </div>
          {patient.emergencyInfo?.criticalAllergies?.length > 0 && (
            <div className={styles.allergyWarning}>
              <Warning style={{ fontSize: '18px' }} />
              <span className={styles.allergyText}>
                Allergies: {patient.emergencyInfo.criticalAllergies.join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Medications List or Empty State */}
      {!Array.isArray(medications) || medications.length === 0 ? (
        <div className={styles.emptyState}>
          <MedicationIcon style={{ fontSize: '64px', color: '#cbd5e1' }} />
          <p className={styles.emptyText}>No medications found</p>
          <p className={styles.emptySubtext}>
            Your medication history will appear here once medications are added to your record
          </p>
        </div>
      ) : (
        <>
          {/* Medications Grid */}
          <div className={styles.medicationsGrid}>
            {medications.map((medication, index) => {
              const statusConfig = getStatusConfig(medication.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div key={medication._id || index} className={styles.medicationCard}>
                  {/* Card Header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.medicationIconWrapper}>
                      <MedicationIcon style={{ fontSize: '24px', color: '#8b5cf6' }} />
                    </div>
                    <div className={styles.medicationTitleSection}>
                      <h3 className={styles.medicationName}>
                        {medication.name || "Unnamed Medication"}
                      </h3>
                      <span className={statusConfig.className}>
                        <StatusIcon style={{ fontSize: '16px' }} />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Dosage and Frequency */}
                  <div className={styles.dosageSection}>
                    <div className={styles.dosageCard}>
                      <span className={styles.dosageLabel}>Dosage</span>
                      <span className={styles.dosageValue}>
                        {medication.dosage || "Not specified"}
                      </span>
                    </div>
                    <div className={styles.frequencyCard}>
                      <span className={styles.frequencyLabel}>Frequency</span>
                      <span className={styles.frequencyValue}>
                        {medication.frequency || "Not specified"}
                      </span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className={styles.durationSection}>
                    <div className={styles.durationItem}>
                      <CalendarToday style={{ fontSize: '16px', color: '#64748b' }} />
                      <div className={styles.durationContent}>
                        <span className={styles.durationLabel}>Start Date</span>
                        <span className={styles.durationValue}>
                          {medication.startDate
                            ? new Date(medication.startDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.durationDivider}></div>
                    <div className={styles.durationItem}>
                      <Schedule style={{ fontSize: '16px', color: '#64748b' }} />
                      <div className={styles.durationContent}>
                        <span className={styles.durationLabel}>End Date</span>
                        <span className={styles.durationValue}>
                          {medication.endDate
                            ? new Date(medication.endDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : "Ongoing"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Prescriber Info */}
                  {medication.prescribedBy && (
                    <div className={styles.prescriberSection}>
                      <LocalHospital style={{ fontSize: '16px', color: '#3b82f6' }} />
                      <div className={styles.prescriberContent}>
                        <span className={styles.prescriberLabel}>Prescribed by</span>
                        <span className={styles.prescriberName}>
                          {medication.prescribedBy}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {medication.notes && (
                    <div className={styles.notesSection}>
                      <Info style={{ fontSize: '16px', color: '#64748b' }} />
                      <div className={styles.notesContent}>
                        <span className={styles.notesLabel}>Instructions</span>
                        <p className={styles.notesText}>{medication.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
};

export default Medications;