import React from "react";
import {
  LocalHospital,
  Person,
  CalendarToday,
  Description,
  EventAvailable,
  CheckCircle,
  Schedule,
  Cancel,
  Medication,
} from "@mui/icons-material";
import styles from "./RecentVisits.module.css";

const RecentVisits = ({ visits = [] }) => {
  const getStatusConfig = (status) => {
    if (!status) return { color: "#6b7280", label: "Unknown", className: styles.statusUnknown };
    
    switch (status.toLowerCase()) {
      case "completed":
        return { color: "#10b981", label: "Completed", className: styles.statusCompleted, icon: CheckCircle };
      case "pending":
        return { color: "#f59e0b", label: "Pending", className: styles.statusPending, icon: Schedule };
      case "cancelled":
        return { color: "#ef4444", label: "Cancelled", className: styles.statusCancelled, icon: Cancel };
      default:
        return { color: "#6b7280", label: status, className: styles.statusUnknown };
    }
  };

  return (
    <div className={styles.recentVisits}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <LocalHospital style={{ color: '#3b82f6', fontSize: '28px' }} />
          <div>
            <h2 className={styles.sectionTitle}>Recent Medical Visits</h2>
            <p className={styles.sectionSubtitle}>
              Your complete medical visit history and records
            </p>
          </div>
        </div>
        <div className={styles.visitCount}>
          <span className={styles.countNumber}>{visits.length}</span>
          <span className={styles.countLabel}>Total Visits</span>
        </div>
      </div>

      {visits.length === 0 ? (
        <div className={styles.emptyState}>
          <LocalHospital style={{ fontSize: '64px', color: '#cbd5e1' }} />
          <p className={styles.emptyText}>No medical visits recorded yet</p>
          <p className={styles.emptySubtext}>
            Your visit history will appear here once you have medical records
          </p>
        </div>
      ) : (
        <div className={styles.visitsTimeline}>
          {visits.map((visit, index) => {
            const statusConfig = getStatusConfig(visit.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={index} className={styles.visitCard}>
                {/* Timeline connector */}
                {index !== visits.length - 1 && (
                  <div className={styles.timelineConnector}></div>
                )}

                {/* Visit Card Content */}
                <div className={styles.visitContent}>
                  {/* Card Header */}
                  <div className={styles.visitHeader}>
                    <div className={styles.visitTitleSection}>
                      <div className={styles.diagnosisIconWrapper}>
                        <LocalHospital style={{ fontSize: '24px' }} />
                      </div>
                      <div>
                        <h3 className={styles.diagnosisTitle}>
                          {visit.diagnosis || "General Consultation"}
                        </h3>
                        <div className={styles.visitMeta}>
                          <span className={styles.metaItem}>
                            <CalendarToday style={{ fontSize: '14px' }} />
                            {visit.visitDate
                              ? new Date(visit.visitDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : "Date not available"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.statusBadgeWrapper}>
                      <span className={statusConfig.className}>
                        {StatusIcon && <StatusIcon style={{ fontSize: '16px' }} />}
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Visit Details Grid */}
                  <div className={styles.visitDetailsGrid}>
                    {/* Doctor Info */}
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon} style={{ backgroundColor: '#dbeafe' }}>
                        <Person style={{ color: '#3b82f6', fontSize: '20px' }} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Doctor</span>
                        <span className={styles.detailValue}>
                          {visit.medic?.name || "Unknown Doctor"}
                        </span>
                      </div>
                    </div>

                    {/* Department Info */}
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon} style={{ backgroundColor: '#dcfce7' }}>
                        <LocalHospital style={{ color: '#10b981', fontSize: '20px' }} />
                      </div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Department</span>
                        <span className={styles.detailValue}>
                          {visit.department || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Follow-up Date */}
                    {visit.followUpDate && (
                      <div className={styles.detailCard}>
                        <div className={styles.detailIcon} style={{ backgroundColor: '#fef3c7' }}>
                          <EventAvailable style={{ color: '#f59e0b', fontSize: '20px' }} />
                        </div>
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Follow-up</span>
                          <span className={styles.detailValue}>
                            {new Date(visit.followUpDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes Section */}
                  {visit.notes && visit.notes !== "—" && (
                    <div className={styles.notesSection}>
                      <div className={styles.notesHeader}>
                        <Description style={{ fontSize: '18px', color: '#64748b' }} />
                        <span className={styles.notesLabel}>Medical Notes</span>
                      </div>
                      <p className={styles.notesText}>{visit.notes}</p>
                    </div>
                  )}

                  {/* Prescriptions Section */}
                  {visit.prescriptions?.length > 0 && (
                    <div className={styles.prescriptionsSection}>
                      <div className={styles.prescriptionsHeader}>
                        <Medication style={{ fontSize: '18px', color: '#8b5cf6' }} />
                        <span className={styles.prescriptionsLabel}>Prescriptions</span>
                        <span className={styles.prescriptionCount}>
                          {visit.prescriptions.length}
                        </span>
                      </div>
                      <div className={styles.prescriptionGrid}>
                        {visit.prescriptions.map((med, i) => (
                          <div key={i} className={styles.prescriptionItem}>
                            <Medication style={{ fontSize: '16px', color: '#8b5cf6' }} />
                            <span>{med}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentVisits;