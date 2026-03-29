import React, { useState } from 'react';
import { PictureAsPdf } from '@mui/icons-material';
import apiClient from '../config/apiClient';
import styles from './HealthIDCard.module.css';

const HealthIDCard = ({ patient }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    if (!patient || !patient.authId || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Call API to generate PDF
      const pdfBlob = await apiClient.get(`/api/qr/card-pdf/${patient.authId}`);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const healthId = patient.healthId || patient.authId?.slice(0, 8) || 'card';
      link.download = `Health_ID_${healthId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError(err.message || 'Failed to download PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Validate patient data
  if (!patient) {
    return <div className={styles.error}>No patient data available</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3>Emergency Digital Health ID Card</h3>
          <p className={styles.cardDescription}>
            Download your standardized Health ID card. The card is generated server-side 
            to ensure consistent, professional quality across all devices.
          </p>
        </div>
        
        <div className={styles.downloadSection}>
          <button 
            onClick={handleDownload} 
            className={styles.downloadBtn}
            disabled={isGenerating}
          >
            <PictureAsPdf fontSize="small" /> 
            {isGenerating ? 'Generating PDF...' : 'Download Health ID Card PDF'}
          </button>
          
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          {isGenerating && (
            <p className={styles.generatingText}>
              Please wait while we generate your standardized Health ID card...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthIDCard;
