import React, { useState, useEffect, useRef } from 'react';
import { Edit, Save, Cancel, AccessTime } from '@mui/icons-material';
import styles from './EditableHealthVitals.module.css';
import apiClient from '../config/apiClient';

const EditableHealthVitals = ({ vitals, patientAuthId, patientHeight, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedVitals, setEditedVitals] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    weight: '',
    height: '', // Height in cm for BMI calculation
    bmi: '', // Will be auto-calculated, but can be manually entered if height not available
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (vitals) {
      setEditedVitals({
        bloodPressureSystolic: vitals.bloodPressure?.systolic || '',
        bloodPressureDiastolic: vitals.bloodPressure?.diastolic || '',
        heartRate: vitals.heartRate?.value || '',
        weight: vitals.weight?.value || '',
        height: patientHeight || '',
        bmi: vitals.bmi?.value || '',
      });
    }
    
    // Cleanup: cancel ongoing requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [vitals, patientHeight]);

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    // Reset to original values
    if (vitals) {
      setEditedVitals({
        bloodPressureSystolic: vitals.bloodPressure?.systolic || '',
        bloodPressureDiastolic: vitals.bloodPressure?.diastolic || '',
        heartRate: vitals.heartRate?.value || '',
        weight: vitals.weight?.value || '',
        bmi: vitals.bmi?.value || '',
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-auth-id': patientAuthId, // Required for identifyUser middleware
      };

      const payload = {};

      // Blood pressure
      if (editedVitals.bloodPressureSystolic || editedVitals.bloodPressureDiastolic) {
        payload.bloodPressure = {
          systolic: editedVitals.bloodPressureSystolic ? parseInt(editedVitals.bloodPressureSystolic) : null,
          diastolic: editedVitals.bloodPressureDiastolic ? parseInt(editedVitals.bloodPressureDiastolic) : null,
        };
      }

      // Heart rate
      if (editedVitals.heartRate) {
        payload.heartRate = parseInt(editedVitals.heartRate);
      }

      // Weight
      if (editedVitals.weight) {
        payload.weight = parseFloat(editedVitals.weight);
      }

      // Height (for BMI calculation)
      if (editedVitals.height) {
        payload.height = parseFloat(editedVitals.height);
      }

      // BMI (only if manually provided, otherwise backend will calculate)
      if (editedVitals.bmi && !editedVitals.height && !editedVitals.weight) {
        payload.bmi = parseFloat(editedVitals.bmi);
      }

      // Create abort controller for request cancellation
      abortControllerRef.current = new AbortController();
      
      const data = await apiClient.put(`/api/patients/${patientAuthId}/vitals`, payload, {
        signal: abortControllerRef.current.signal,
        authId: patientAuthId
      });

      setSuccess('Health vitals updated successfully!');
      setIsEditing(false);
      
      // Call onUpdate callback to refresh data
      if (onUpdate) {
        onUpdate();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      // Don't show error for cancelled requests
      if (err.name === 'AbortError' || (err.message && err.message.includes('cancelled'))) {
        return;
      }
      setError(err.message || 'Failed to update health vitals');
    } finally {
      setLoading(false);
    }
  };

  const formatBloodPressure = () => {
    if (!vitals?.bloodPressure?.systolic && !vitals?.bloodPressure?.diastolic) {
      return 'Not provided';
    }
    const systolic = vitals.bloodPressure?.systolic || '';
    const diastolic = vitals.bloodPressure?.diastolic || '';
    return `${systolic}/${diastolic}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.healthVitals}>
      <div className={styles.header}>
        <h3 className={styles.title}>Health Summary</h3>
        {!isEditing && (
          <button className={styles.editBtn} onClick={handleEdit}>
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

      <div className={styles.vitalsGrid}>
        {/* Blood Pressure */}
        <div className={styles.vitalCard}>
          <div className={styles.vitalLabel}>Blood Pressure</div>
          {isEditing ? (
            <div className={styles.editInputs}>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="Systolic (50-250)"
                  min="50"
                  max="250"
                  value={editedVitals.bloodPressureSystolic}
                  onChange={(e) => setEditedVitals({ ...editedVitals, bloodPressureSystolic: e.target.value })}
                  className={styles.input}
                />
                <span className={styles.inputHint}>(50-250)</span>
              </div>
              <span className={styles.separator}>/</span>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="Diastolic (30-150)"
                  min="30"
                  max="150"
                  value={editedVitals.bloodPressureDiastolic}
                  onChange={(e) => setEditedVitals({ ...editedVitals, bloodPressureDiastolic: e.target.value })}
                  className={styles.input}
                />
                <span className={styles.inputHint}>(30-150)</span>
              </div>
            </div>
          ) : (
            <div className={styles.vitalValue}>{formatBloodPressure()}</div>
          )}
          {vitals?.bloodPressure?.lastUpdated && (
            <div className={styles.timestamp}>
              <AccessTime style={{ fontSize: '12px', marginRight: '4px' }} />
              Updated: {formatDate(vitals.bloodPressure.lastUpdated)}
            </div>
          )}
        </div>

        {/* Heart Rate */}
        <div className={styles.vitalCard}>
          <div className={styles.vitalLabel}>Heart Rate</div>
          {isEditing ? (
            <div className={styles.editInputs}>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  placeholder="bpm (30-250)"
                  min="30"
                  max="250"
                  value={editedVitals.heartRate}
                  onChange={(e) => setEditedVitals({ ...editedVitals, heartRate: e.target.value })}
                  className={styles.input}
                />
                <span className={styles.inputHint}>(30-250 bpm)</span>
              </div>
              <span className={styles.unit}>bpm</span>
            </div>
          ) : (
            <div className={styles.vitalValue}>
              {vitals?.heartRate?.value ? `${vitals.heartRate.value} ${vitals.heartRate.unit || 'bpm'}` : 'Not provided'}
            </div>
          )}
          {vitals?.heartRate?.lastUpdated && (
            <div className={styles.timestamp}>
              <AccessTime style={{ fontSize: '12px', marginRight: '4px' }} />
              Updated: {formatDate(vitals.heartRate.lastUpdated)}
            </div>
          )}
        </div>

        {/* Weight */}
        <div className={styles.vitalCard}>
          <div className={styles.vitalLabel}>Weight</div>
          {isEditing ? (
            <div className={styles.editInputs}>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="kg (1-500)"
                  min="1"
                  max="500"
                  value={editedVitals.weight}
                  onChange={(e) => setEditedVitals({ ...editedVitals, weight: e.target.value })}
                  className={styles.input}
                />
                <span className={styles.inputHint}>(1-500 kg)</span>
              </div>
              <span className={styles.unit}>kg</span>
            </div>
          ) : (
            <div className={styles.vitalValue}>
              {vitals?.weight?.value ? `${vitals.weight.value} ${vitals.weight.unit || 'kg'}` : 'Not provided'}
            </div>
          )}
          {vitals?.weight?.lastUpdated && (
            <div className={styles.timestamp}>
              <AccessTime style={{ fontSize: '12px', marginRight: '4px' }} />
              Updated: {formatDate(vitals.weight.lastUpdated)}
            </div>
          )}
        </div>

        {/* Height (for BMI calculation) */}
        <div className={styles.vitalCard}>
          <div className={styles.vitalLabel}>Height</div>
          {isEditing ? (
            <div className={styles.editInputs}>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="cm (30-300)"
                  min="30"
                  max="300"
                  value={editedVitals.height}
                  onChange={(e) => setEditedVitals({ ...editedVitals, height: e.target.value })}
                  className={styles.input}
                />
                <span className={styles.inputHint}>(30-300 cm)</span>
              </div>
              <span className={styles.unit}>cm</span>
            </div>
          ) : (
            <div className={styles.vitalValue}>
              {patientHeight ? `${patientHeight} cm` : 'Not provided'}
            </div>
          )}
        </div>

        {/* BMI - Auto-calculated if height and weight are available */}
        <div className={styles.vitalCard}>
          <div className={styles.vitalLabel}>
            BMI
            {(editedVitals.height && editedVitals.weight || patientHeight && vitals?.weight?.value) && (
              <span className={styles.autoCalcBadge}>(Auto-calculated)</span>
            )}
          </div>
          {isEditing ? (
            <div className={styles.editInputs}>
              {editedVitals.height && editedVitals.weight ? (
                <div className={styles.vitalValue} style={{ color: '#10b981' }}>
                  {((parseFloat(editedVitals.weight) / Math.pow((parseFloat(editedVitals.height) / 100), 2)).toFixed(1))}
                </div>
              ) : (
                <div className={styles.inputGroup}>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="BMI (10-70)"
                    min="10"
                    max="70"
                    value={editedVitals.bmi}
                    onChange={(e) => setEditedVitals({ ...editedVitals, bmi: e.target.value })}
                    className={styles.input}
                    disabled={!!(editedVitals.height && editedVitals.weight)}
                  />
                  <span className={styles.inputHint}>(10-70)</span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.vitalValue}>
              {vitals?.bmi?.value ? vitals.bmi.value : 'Not provided'}
            </div>
          )}
          {vitals?.bmi?.lastUpdated && (
            <div className={styles.timestamp}>
              <AccessTime style={{ fontSize: '12px', marginRight: '4px' }} />
              Updated: {formatDate(vitals.bmi.lastUpdated)}
            </div>
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

export default EditableHealthVitals;

