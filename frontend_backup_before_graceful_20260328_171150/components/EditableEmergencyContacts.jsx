import React, { useState, useEffect } from 'react';
import { 
  Edit, Save, Cancel, Add, Delete, Phone, Email, LocationOn, 
  ContactPhone, PersonAdd, Star 
} from '@mui/icons-material';
import styles from './EditableEmergencyContacts.module.css';
import apiClient from '../config/apiClient';

const EditableEmergencyContacts = ({ contacts, patientId, patientAuthId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingContacts, setEditingContacts] = useState([]);

  useEffect(() => {
    const normalized = Array.isArray(contacts) ? contacts : contacts ? [contacts] : [];
    
    if (normalized.length > 0) {
      setEditingContacts(normalized.map(c => ({
        _id: c._id || c.id,
        name: c.name || '',
        relationship: c.relationship || c.relation || '',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        isPrimary: c.isPrimary || c.primary || false,
      })));
    } else {
      setEditingContacts([]);
    }
  }, [contacts]);

  const handleAddContact = () => {
    setEditingContacts([...editingContacts, {
      _id: null,
      name: '',
      relationship: '',
      phone: '',
      email: '',
      address: '',
      isPrimary: false,
    }]);
  };

  const handleRemoveContact = (index) => {
    setEditingContacts(editingContacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...editingContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEditingContacts(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      for (const contact of editingContacts) {
        if (!contact.name || !contact.relationship || !contact.phone) {
          throw new Error('All contacts must have name, relationship, and phone');
        }
      }

      const updatePayload = {
        emergencyInfo: {
          primaryEmergencyContacts: editingContacts.map(c => ({
            name: c.name,
            relation: c.relationship,
            phone: c.phone,
            email: c.email || undefined,
            address: c.address || undefined,
            isPrimary: c.isPrimary || false,
          })),
        },
      };

      await apiClient.put(`/api/patients/${patientAuthId}`, updatePayload, {
        authId: patientAuthId,
      });

      setSuccess('Emergency contacts updated successfully!');
      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    const normalized = Array.isArray(contacts) ? contacts : contacts ? [contacts] : [];
    setEditingContacts(normalized.length > 0 ? normalized.map(c => ({
      _id: c._id || c.id,
      name: c.name || '',
      relationship: c.relationship || c.relation || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      isPrimary: c.isPrimary || c.primary || false,
    })) : []);
  };

  if (!isEditing && editingContacts.length === 0) {
    return (
      <div className={styles.editableContacts}>
        <div className={styles.header}>
          <h3 className={styles.title}>Emergency Contacts</h3>
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
            <Edit style={{ fontSize: '18px', marginRight: '4px' }} />
            Add Contacts
          </button>
        </div>
        <div className={styles.emptyState}>
          <ContactPhone style={{ fontSize: '64px', color: '#cbd5e1' }} />
          <p className={styles.emptyText}>No emergency contacts added yet</p>
          <p className={styles.emptySubtext}>
            Add contacts who can be reached in case of medical emergencies
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editableContacts}>
      <div className={styles.header}>
        <h3 className={styles.title}>Emergency Contacts</h3>
        {!isEditing && (
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
            <Edit style={{ fontSize: '18px', marginRight: '4px' }} />
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successMessage}>
          {success}
        </div>
      )}

      {isEditing ? (
        <div className={styles.editMode}>
          {editingContacts.map((contact, index) => (
            <div key={index} className={styles.contactForm}>
              <div className={styles.contactFormHeader}>
                <h4>Contact {index + 1}</h4>
                {editingContacts.length > 1 && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveContact(index)}
                    type="button"
                  >
                    <Delete />
                  </button>
                )}
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name *</label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                    className={styles.input}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Relationship *</label>
                  <input
                    type="text"
                    value={contact.relationship}
                    onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                    className={styles.input}
                    placeholder="e.g., Spouse, Parent, Friend"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone *</label>
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                    className={styles.input}
                    placeholder="Phone number"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                    className={styles.input}
                    placeholder="Email address"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Address</label>
                  <input
                    type="text"
                    value={contact.address}
                    onChange={(e) => handleContactChange(index, 'address', e.target.value)}
                    className={styles.input}
                    placeholder="Address"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={contact.isPrimary}
                      onChange={(e) => handleContactChange(index, 'isPrimary', e.target.checked)}
                      className={styles.checkbox}
                    />
                    <Star style={{ fontSize: '16px', color: '#f59e0b', marginRight: '4px' }} />
                    Primary Contact
                  </label>
                </div>
              </div>
            </div>
          ))}

          <button className={styles.addContactBtn} onClick={handleAddContact} type="button">
            <Add />
            Add Another Contact
          </button>

          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
              <Save style={{ fontSize: '18px', marginRight: '4px' }} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button className={styles.cancelBtn} onClick={handleCancel} disabled={loading}>
              <Cancel style={{ fontSize: '18px', marginRight: '4px' }} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.viewMode}>
          {editingContacts.map((contact, index) => (
            <div key={index} className={styles.contactCard}>
              {contact.isPrimary && (
                <div className={styles.primaryBadge}>
                  <Star style={{ fontSize: '14px' }} />
                  Primary Contact
                </div>
              )}
              <div className={styles.contactInfo}>
                <h4 className={styles.contactName}>{contact.name}</h4>
                <span className={styles.contactRelationship}>{contact.relationship}</span>
              </div>
              <div className={styles.contactDetails}>
                {contact.phone && (
                  <div className={styles.detailItem}>
                    <Phone style={{ fontSize: '18px', color: '#3b82f6' }} />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className={styles.detailItem}>
                    <Email style={{ fontSize: '18px', color: '#10b981' }} />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.address && (
                  <div className={styles.detailItem}>
                    <LocationOn style={{ fontSize: '18px', color: '#f59e0b' }} />
                    <span>{contact.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditableEmergencyContacts;

