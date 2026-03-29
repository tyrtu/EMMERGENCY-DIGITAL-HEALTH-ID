import React, { useState, useEffect } from 'react';
import { Edit, Save, Cancel, PhotoCamera, Person } from '@mui/icons-material';
import styles from './EditableBasicInfo.module.css';
import apiClient from '../config/apiClient';

const EditableBasicInfo = ({ patient, patientAuthId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    age: '',
    gender: 'Other',
    height: '',
    bloodGroup: 'Unknown',
    nationalId: '',
    occupation: '',
    maritalStatus: 'Single',
    contact: {
      email: '',
      phone: '',
    },
    address: {
      street: '',
      city: '',
      county: '',
      country: '',
    },
  });

  useEffect(() => {
    if (patient?.basicInfo) {
      const basicInfo = patient.basicInfo;
      setFormData({
        fullName: basicInfo.fullName || '',
        dob: basicInfo.dob ? new Date(basicInfo.dob).toISOString().split('T')[0] : '',
        age: basicInfo.age || '',
        gender: basicInfo.gender || 'Other',
        height: basicInfo.height || '',
        bloodGroup: basicInfo.bloodGroup || 'Unknown',
        nationalId: basicInfo.nationalId || '',
        occupation: basicInfo.occupation || '',
        maritalStatus: basicInfo.maritalStatus || 'Single',
        contact: {
          email: basicInfo.contact?.email || '',
          phone: basicInfo.contact?.phone || '',
        },
        address: {
          street: basicInfo.address?.street || '',
          city: basicInfo.address?.city || '',
          county: basicInfo.address?.county || '',
          country: basicInfo.address?.country || '',
        },
      });
    }
  }, [patient]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/patients/${patientAuthId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-id': patientAuthId,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload photo');
      }

      setSuccess('Photo updated successfully!');
      if (onUpdate) {
        onUpdate();
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updatePayload = {
        fullName: formData.fullName,
        dob: formData.dob || undefined,
        age: formData.age || undefined,
        gender: formData.gender,
        height: formData.height || undefined,
        bloodGroup: formData.bloodGroup,
        nationalId: formData.nationalId || undefined,
        occupation: formData.occupation || undefined,
        maritalStatus: formData.maritalStatus,
        contact: {
          email: formData.contact.email || undefined,
          phone: formData.contact.phone || undefined,
        },
        address: {
          street: formData.address.street || undefined,
          city: formData.address.city || undefined,
          county: formData.address.county || undefined,
          country: formData.address.country || undefined,
        },
      };

      const data = await apiClient.put(`/api/patients/${patientAuthId}/basic-info`, updatePayload, {
        authId: patientAuthId,
      });

      setSuccess('Basic information updated successfully!');
      setIsEditing(false);
      if (onUpdate) {
        onUpdate();
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update basic information');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    // Reset form data
    if (patient?.basicInfo) {
      const basicInfo = patient.basicInfo;
      setFormData({
        fullName: basicInfo.fullName || '',
        dob: basicInfo.dob ? new Date(basicInfo.dob).toISOString().split('T')[0] : '',
        age: basicInfo.age || '',
        gender: basicInfo.gender || 'Other',
        height: basicInfo.height || '',
        bloodGroup: basicInfo.bloodGroup || 'Unknown',
        nationalId: basicInfo.nationalId || '',
        occupation: basicInfo.occupation || '',
        maritalStatus: basicInfo.maritalStatus || 'Single',
        contact: {
          email: basicInfo.contact?.email || '',
          phone: basicInfo.contact?.phone || '',
        },
        address: {
          street: basicInfo.address?.street || '',
          city: basicInfo.address?.city || '',
          county: basicInfo.address?.county || '',
          country: basicInfo.address?.country || '',
        },
      });
    }
  };

  // Get photo URL - handle both absolute URLs and relative paths
  const getPhotoUrl = () => {
    if (!patient?.basicInfo?.profilePhoto) return null;
    const photoPath = patient.basicInfo.profilePhoto;
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    // If it starts with /uploads, use the API base URL
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    return `${apiBaseUrl}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  const photoUrl = getPhotoUrl();

  return (
    <div className={styles.basicInfo}>
      <div className={styles.header}>
        <h3 className={styles.title}>Basic Information</h3>
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

      {/* Photo Upload Section - Only show when editing */}
      {isEditing && (
        <div className={styles.photoSection}>
          <div className={styles.photoPreview}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className={styles.profilePhoto} />
            ) : (
              <div className={styles.photoPlaceholder}>
                <Person style={{ fontSize: '48px', color: '#94a3b8' }} />
              </div>
            )}
            <div className={styles.photoOverlay}>
              <label className={styles.photoUploadBtn}>
                <PhotoCamera style={{ fontSize: '20px', marginRight: '4px' }} />
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
          </div>
        </div>
      )}

      {/* Basic Info Form */}
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name *</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className={styles.input}
              required
            />
          ) : (
            <div className={styles.value}>{formData.fullName || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Date of Birth</label>
          {isEditing ? (
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => handleInputChange('dob', e.target.value)}
              className={styles.input}
            />
          ) : (
            <div className={styles.value}>
              {formData.dob ? new Date(formData.dob).toLocaleDateString() : 'Not provided'}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Age</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              className={styles.input}
              placeholder="Age"
            />
          ) : (
            <div className={styles.value}>{formData.age || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Gender</label>
          {isEditing ? (
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className={styles.input}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          ) : (
            <div className={styles.value}>{formData.gender}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Height (cm)</label>
          {isEditing ? (
            <input
              type="number"
              value={formData.height}
              onChange={(e) => handleInputChange('height', e.target.value)}
              className={styles.input}
              placeholder="Height in cm"
            />
          ) : (
            <div className={styles.value}>{formData.height ? `${formData.height} cm` : 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Blood Group</label>
          {isEditing ? (
            <select
              value={formData.bloodGroup}
              onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
              className={styles.input}
            >
              <option value="Unknown">Unknown</option>
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
            <div className={styles.value}>{formData.bloodGroup}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>National ID</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.nationalId}
              onChange={(e) => handleInputChange('nationalId', e.target.value)}
              className={styles.input}
              placeholder="National ID"
            />
          ) : (
            <div className={styles.value}>{formData.nationalId || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Occupation</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => handleInputChange('occupation', e.target.value)}
              className={styles.input}
              placeholder="Occupation"
            />
          ) : (
            <div className={styles.value}>{formData.occupation || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Marital Status</label>
          {isEditing ? (
            <select
              value={formData.maritalStatus}
              onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
              className={styles.input}
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          ) : (
            <div className={styles.value}>{formData.maritalStatus}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          {isEditing ? (
            <input
              type="email"
              value={formData.contact.email}
              onChange={(e) => handleInputChange('contact.email', e.target.value)}
              className={styles.input}
              placeholder="Email"
            />
          ) : (
            <div className={styles.value}>{formData.contact.email || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Phone</label>
          {isEditing ? (
            <input
              type="tel"
              value={formData.contact.phone}
              onChange={(e) => handleInputChange('contact.phone', e.target.value)}
              className={styles.input}
              placeholder="Phone number"
            />
          ) : (
            <div className={styles.value}>{formData.contact.phone || 'Not provided'}</div>
          )}
        </div>

        {/* Address Fields */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Street Address</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.street}
              onChange={(e) => handleInputChange('address.street', e.target.value)}
              className={styles.input}
              placeholder="Street address"
            />
          ) : (
            <div className={styles.value}>{formData.address.street || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>City</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.city}
              onChange={(e) => handleInputChange('address.city', e.target.value)}
              className={styles.input}
              placeholder="City"
            />
          ) : (
            <div className={styles.value}>{formData.address.city || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>County/State</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.county}
              onChange={(e) => handleInputChange('address.county', e.target.value)}
              className={styles.input}
              placeholder="County/State"
            />
          ) : (
            <div className={styles.value}>{formData.address.county || 'Not provided'}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Country</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.address.country}
              onChange={(e) => handleInputChange('address.country', e.target.value)}
              className={styles.input}
              placeholder="Country"
            />
          ) : (
            <div className={styles.value}>{formData.address.country || 'Not provided'}</div>
          )}
        </div>
      </div>

      {isEditing && (
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
      )}
    </div>
  );
};

export default EditableBasicInfo;

