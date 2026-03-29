import React from "react";
import styles from "./EmergencyContacts.module.css";
import { 
  Phone, 
  Message, 
  Add, 
  Emergency, 
  Email, 
  LocationOn,
  ContactPhone,
  Group,
  Star,
  PersonAdd,
  PhoneInTalk,
  LocalHospital,
} from "@mui/icons-material";

/**
 * EmergencyContacts component
 * - Safely handles missing/invalid props
 * - Normalizes different contact shapes returned by backend
 * - Displays available fields (name, relationship, phone, email, address)
 * - Disables call/message buttons when phone is missing
 */
const EmergencyContacts = ({ contacts }) => {
  // Normalize contacts to an array and guard against null/undefined
  const normalized =
    Array.isArray(contacts) ? contacts : contacts ? [contacts] : [];

  // Safely pick a stable key from various possible _id shapes
  const getKey = (contact, idx) => {
    if (!contact) return idx;
    if (contact._id && typeof contact._id === "string") return contact._id;
    if (contact._id && contact._id.$oid) return contact._id.$oid;
    if (contact.id) return contact.id;
    return idx;
  };

  const handleCall = (phone) => {
    if (!phone) return;
    window.open(`tel:${phone}`, "_self");
  };

  const handleMessage = (phone) => {
    if (!phone) return;
    window.open(`sms:${phone}`, "_self");
  };

  const handleEmergencyServices = () => {
    // Emergency services number (configurable)
    const emergencyNumber = "911"; // or "999", "112" based on location
    window.open(`tel:${emergencyNumber}`, "_self");
  };

  // Count primary contacts
  const primaryCount = normalized.filter(
    contact => contact?.isPrimary || contact?.primary || contact?.priority === 1
  ).length;

  if (normalized.length === 0) {
    return (
      <div className={styles.emergencyContacts}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <ContactPhone style={{ color: '#ef4444', fontSize: '28px' }} />
            <div>
              <h2 className={styles.sectionTitle}>Emergency Contacts</h2>
              <p className={styles.sectionSubtitle}>
                Add trusted contacts for emergencies
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className={styles.emptyState}>
          <Group style={{ fontSize: '64px', color: '#cbd5e1' }} />
          <p className={styles.emptyText}>No emergency contacts added yet</p>
          <p className={styles.emptySubtext}>
            Add contacts who can be reached in case of medical emergencies
          </p>
          <button className={styles.addContactBtn}>
            <PersonAdd />
            Add Your First Contact
          </button>
        </div>

        {/* Emergency Services Button */}
        <div className={styles.emergencyServicesSection}>
          <button
            className={styles.emergencyServicesBtn}
            onClick={handleEmergencyServices}
          >
            <Emergency />
            <div className={styles.emergencyBtnContent}>
              <span className={styles.emergencyBtnTitle}>Emergency Services</span>
              <span className={styles.emergencyBtnSubtext}>Call 911 immediately</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.emergencyContacts}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <ContactPhone style={{ color: '#ef4444', fontSize: '28px' }} />
          <div>
            <h2 className={styles.sectionTitle}>Emergency Contacts</h2>
            <p className={styles.sectionSubtitle}>
              Quick access to your trusted contacts
            </p>
          </div>
        </div>
        <div className={styles.contactsCount}>
          <div className={styles.countBadge}>
            <span className={styles.countNumber}>{normalized.length}</span>
            <span className={styles.countLabel}>Total</span>
          </div>
          {primaryCount > 0 && (
            <>
              <div className={styles.countDivider}></div>
              <div className={styles.countBadge}>
                <Star style={{ fontSize: '20px', color: '#f59e0b' }} />
                <span className={styles.countLabel}>{primaryCount} Primary</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contacts Grid */}
      <div className={styles.contactsGrid}>
        {normalized.map((contact, idx) => {
          const phone = contact?.phone || contact?.contactPhone || "";
          const email = contact?.email || contact?.contactEmail || "";
          const address = contact?.address || contact?.location || "";
          const isPrimary =
            contact?.isPrimary || contact?.primary || contact?.priority === 1;

          const createdAt = contact?.createdAt
            ? new Date(contact.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : contact?._id?.createdAt
            ? new Date(contact._id.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : null;

          return (
            <div key={getKey(contact, idx)} className={styles.contactCard}>
              {/* Primary Badge */}
              {isPrimary && (
                <div className={styles.primaryBadge}>
                  <Star style={{ fontSize: '14px' }} />
                  Primary Contact
                </div>
              )}

              {/* Contact Header */}
              <div className={styles.contactHeader}>
                <div className={styles.contactAvatar}>
                  <ContactPhone style={{ fontSize: '28px' }} />
                </div>
                <div className={styles.contactInfo}>
                  <h3 className={styles.contactName}>
                    {contact?.name || "Unnamed Contact"}
                  </h3>
                  <span className={styles.contactRelationship}>
                    {contact?.relationship || "No relationship specified"}
                  </span>
                </div>
              </div>

              {/* Contact Details */}
              <div className={styles.contactDetails}>
                {/* Phone */}
                {phone ? (
                  <div className={styles.detailItem}>
                    <div className={styles.detailIcon} style={{ backgroundColor: '#dbeafe' }}>
                      <Phone style={{ fontSize: '18px', color: '#3b82f6' }} />
                    </div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Phone</span>
                      <span className={styles.detailValue}>{phone}</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.detailItem}>
                    <div className={styles.detailIcon} style={{ backgroundColor: '#f1f5f9' }}>
                      <Phone style={{ fontSize: '18px', color: '#94a3b8' }} />
                    </div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Phone</span>
                      <span className={styles.detailValueMissing}>Not provided</span>
                    </div>
                  </div>
                )}

                {/* Email */}
                {email && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailIcon} style={{ backgroundColor: '#dcfce7' }}>
                      <Email style={{ fontSize: '18px', color: '#10b981' }} />
                    </div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Email</span>
                      <span className={styles.detailValue}>{email}</span>
                    </div>
                  </div>
                )}

                {/* Address */}
                {address && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailIcon} style={{ backgroundColor: '#fef3c7' }}>
                      <LocationOn style={{ fontSize: '18px', color: '#f59e0b' }} />
                    </div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Address</span>
                      <span className={styles.detailValue}>{address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Creation Date */}
              {createdAt && (
                <div className={styles.contactMeta}>
                  <span className={styles.metaText}>Added on {createdAt}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className={styles.contactActions}>
                <button
                  className={styles.callBtn}
                  onClick={() => handleCall(phone)}
                  disabled={!phone}
                  title={phone ? `Call ${contact?.name}` : "No phone available"}
                >
                  <PhoneInTalk />
                  Call
                </button>

                <button
                  className={styles.messageBtn}
                  onClick={() => handleMessage(phone)}
                  disabled={!phone}
                  title={phone ? `Message ${contact?.name}` : "No phone available"}
                >
                  <Message />
                  Message
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className={styles.bottomActions}>
        <button
          className={styles.emergencyServicesBtn}
          onClick={handleEmergencyServices}
        >
          <Emergency />
          <div className={styles.emergencyBtnContent}>
            <span className={styles.emergencyBtnTitle}>Emergency Services</span>
            <span className={styles.emergencyBtnSubtext}>Call 911 immediately</span>
          </div>
        </button>

        <button
          className={styles.addContactSecondaryBtn}
          onClick={() => {
            window.alert("Open add contact UI (not implemented)");
          }}
        >
          <PersonAdd />
          Add New Contact
        </button>
      </div>
    </div>
  );
};

export default EmergencyContacts;