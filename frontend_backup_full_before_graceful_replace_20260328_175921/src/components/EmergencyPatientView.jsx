import React, { useEffect, useState } from 'react';
import apiClient from '../config/apiClient';
import {
  Bloodtype,
  Warning,
  Emergency,
  LocalHospital,
  ContactPhone,
  Medication,
  Favorite,
  FavoriteBorder,
  Phone,
  Email,
  Print,
  Download,
  Info,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Person,
  PictureAsPdf,
  Description,
  TableChart,
  Error
} from '@mui/icons-material';
import {
  calculatePriority,
  getBloodCompatibility,
  getApplicableProtocols,
  getEmergencyContactActions,
  playAlertSound
} from '../utils/emergencyUtils';
import styles from './EmergencyPatientView.module.css';

const EmergencyPatientView = ({ patientData, isUnconscious = false }) => {
  const [priority, setPriority] = useState('normal');
  const [alerts, setAlerts] = useState([]);
  const [bloodInfo, setBloodInfo] = useState(null);
  const [protocols, setProtocols] = useState([]);
  const [showAllInfo, setShowAllInfo] = useState(!isUnconscious);
  const [fullPatientData, setFullPatientData] = useState(null);
  const [loadingFullData, setLoadingFullData] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  useEffect(() => {
    if (!patientData) return;

    // Calculate priority and alerts
    const priorityResult = calculatePriority(patientData);
    setPriority(priorityResult.priority);
    setAlerts(priorityResult.alerts);

    // Play alert sound based on priority
    if (priorityResult.priority === 'critical') {
      playAlertSound('critical');
    } else if (priorityResult.priority === 'caution') {
      playAlertSound('caution');
    }

    // Get blood compatibility
    const bloodGroup = patientData.bg || patientData.bloodGroup || patientData.basicInfo?.bloodGroup;
    if (bloodGroup) {
      setBloodInfo(getBloodCompatibility(bloodGroup));
    }

    // Get applicable protocols
    const applicableProtocols = getApplicableProtocols(patientData);
    setProtocols(applicableProtocols);
  }, [patientData, isUnconscious]);

  if (!patientData) {
    return (
      <div className={styles.noData}>
        <Info style={{ fontSize: '48px', color: '#cbd5e1' }} />
        <p>No patient data available</p>
      </div>
    );
  }

  const patientName = patientData.n || patientData.fullName || patientData.basicInfo?.fullName || fullPatientData?.basicInfo?.fullName || 'Unknown Patient';
  const bloodGroup = patientData.bg || patientData.bloodGroup || patientData.basicInfo?.bloodGroup || fullPatientData?.basicInfo?.bloodGroup || 'Unknown';
  const criticalAllergies = patientData.alg || patientData.criticalAllergies || patientData.emergencyInfo?.criticalAllergies || fullPatientData?.emergencyInfo?.criticalAllergies || [];
  const currentMedications = patientData.med || patientData.currentMedications || patientData.emergencyInfo?.currentMedications || fullPatientData?.emergencyInfo?.currentMedications || [];
  
  // Get critical conditions from QR (minimal data)
  const criticalConditions = patientData.criticalConditions || patientData.emergencyInfo?.criticalConditions || fullPatientData?.emergencyInfo?.criticalConditions || [];
  
  const emergencyContact = patientData.ec || patientData.emergencyInfo?.primaryEmergencyContacts?.[0] || fullPatientData?.emergencyInfo?.primaryEmergencyContacts?.[0] || null;
  const primaryDoctor = patientData.doc || patientData.emergencyInfo?.primaryDoctor || fullPatientData?.emergencyInfo?.primaryDoctor || null;
  
  // Get age and gender - prioritize fullPatientData, then QR data
  const age = fullPatientData?.basicInfo?.age || patientData.age || patientData.basicInfo?.age || null;
  const gender = fullPatientData?.basicInfo?.gender || patientData.gender || patientData.basicInfo?.gender || null;
  const authId = patientData.id || patientData.authId || fullPatientData?.systemInfo?.authId || null;

  const priorityColors = {
    critical: { bg: '#fee2e2', border: '#dc2626', text: '#dc2626', icon: <Error style={{ fontSize: '20px', color: '#dc2626' }} /> },
    caution: { bg: '#fef3c7', border: '#d97706', text: '#d97706', icon: <Warning style={{ fontSize: '20px', color: '#d97706' }} /> },
    normal: { bg: '#d1fae5', border: '#10b981', text: '#10b981', icon: <CheckCircle style={{ fontSize: '20px', color: '#10b981' }} /> }
  };

  const priorityColor = priorityColors[priority] || priorityColors.normal;

  const handlePrint = () => {
    window.print();
  };

  // Export to PDF
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Emergency Medical Information - ${patientName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #dc2626; border-bottom: 3px solid #dc2626; padding-bottom: 10px; }
            h2 { color: #3b82f6; margin-top: 25px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
            .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .info-row { display: flex; margin: 10px 0; }
            .label { font-weight: 600; width: 200px; color: #475569; }
            .value { flex: 1; color: #1e293b; }
            .critical { background: #fee2e2; padding: 10px; border-left: 4px solid #dc2626; margin: 10px 0; }
            .list-item { margin: 5px 0; padding-left: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #3b82f6; color: white; font-weight: 600; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Emergency Medical Information</h1>
          <div class="section">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Generated By:</strong> EmHealth Emergency System</p>
          </div>
          
          <h2>Patient Identification</h2>
          <div class="section">
            <div class="info-row"><span class="label">Full Name:</span><span class="value">${patientName}</span></div>
            <div class="info-row"><span class="label">Health ID:</span><span class="value">${fullPatientData?.healthId || patientData.healthId || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Age:</span><span class="value">${age || fullPatientData?.basicInfo?.age || 'Not provided'}</span></div>
            <div class="info-row"><span class="label">Blood Group:</span><span class="value"><strong>${bloodGroup}</strong></span></div>
            <div class="info-row"><span class="label">Gender:</span><span class="value">${gender || fullPatientData?.basicInfo?.gender || 'Not provided'}</span></div>
          </div>

          <h2>Critical Medical Information</h2>
          <div class="section">
            <div class="critical">
              <h3 style="margin-top: 0; color: #dc2626;">Medical Conditions</h3>
              ${criticalConditions.length > 0 ? criticalConditions.map(c => `<div class="list-item">• ${c}</div>`).join('') : '<div class="list-item">None reported</div>'}
            </div>
            <div class="critical">
              <h3 style="margin-top: 15px; color: #dc2626;">Critical Allergies</h3>
              ${criticalAllergies.length > 0 ? criticalAllergies.map(a => `<div class="list-item">⚠ ${a}</div>`).join('') : '<div class="list-item">None reported</div>'}
            </div>
            <div>
              <h3 style="margin-top: 15px;">Current Medications</h3>
              ${currentMedications.length > 0 ? currentMedications.map(m => `<div class="list-item">• ${m}</div>`).join('') : '<div class="list-item">None reported</div>'}
            </div>
          </div>

          <h2>Emergency Contacts</h2>
          <div class="section">
            ${emergencyContact ? `
              <div class="info-row"><span class="label">Name:</span><span class="value">${emergencyContact.name || emergencyContact.n || 'Unknown'}</span></div>
              <div class="info-row"><span class="label">Relation:</span><span class="value">${emergencyContact.relation || 'Not specified'}</span></div>
              <div class="info-row"><span class="label">Phone:</span><span class="value">${emergencyContact.phone || 'Not provided'}</span></div>
              <div class="info-row"><span class="label">Email:</span><span class="value">${emergencyContact.email || 'Not provided'}</span></div>
            ` : '<p>No emergency contact provided</p>'}
          </div>

          ${primaryDoctor ? `
            <h2>Primary Doctor</h2>
            <div class="section">
              <div class="info-row"><span class="label">Name:</span><span class="value">${primaryDoctor.name || primaryDoctor.n || 'Unknown'}</span></div>
              <div class="info-row"><span class="label">Hospital:</span><span class="value">${primaryDoctor.hospital || 'Not specified'}</span></div>
              <div class="info-row"><span class="label">Contact:</span><span class="value">${primaryDoctor.contact || 'Not provided'}</span></div>
            </div>
          ` : ''}

          ${bloodInfo ? `
            <h2>Blood Compatibility</h2>
            <div class="section">
              <div class="info-row"><span class="label">Can Receive:</span><span class="value">${bloodInfo.canReceive.join(', ')}</span></div>
              <div class="info-row"><span class="label">Can Donate To:</span><span class="value">${bloodInfo.canDonate.join(', ')}</span></div>
            </div>
          ` : ''}

          ${patientData.criticalNotes ? `
            <h2>Critical Notes</h2>
            <div class="section">
              <p>${patientData.criticalNotes}</p>
            </div>
          ` : ''}

          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #64748b; font-size: 12px;">
            <p>This document was generated by EmHealth Emergency System</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Export to Word Document (DOC)
  const handleExportDOC = () => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Emergency Medical Information - ${patientName}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>90</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #dc2626; border-bottom: 3px solid #dc2626; padding-bottom: 10px; }
            h2 { color: #3b82f6; margin-top: 25px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
            .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .info-row { margin: 10px 0; }
            .label { font-weight: 600; color: #475569; display: inline-block; width: 200px; }
            .value { color: #1e293b; }
            .critical { background: #fee2e2; padding: 10px; border-left: 4px solid #dc2626; margin: 10px 0; }
            .list-item { margin: 5px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <h1>Emergency Medical Information</h1>
          <div class="section">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Generated By:</strong> EmHealth Emergency System</p>
          </div>
          
          <h2>Patient Identification</h2>
          <div class="section">
            <div class="info-row"><span class="label">Full Name:</span><span class="value">${patientName}</span></div>
            <div class="info-row"><span class="label">Health ID:</span><span class="value">${fullPatientData?.healthId || patientData.healthId || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Age:</span><span class="value">${age || fullPatientData?.basicInfo?.age || 'Not provided'}</span></div>
            <div class="info-row"><span class="label">Blood Group:</span><span class="value"><strong>${bloodGroup}</strong></span></div>
            <div class="info-row"><span class="label">Gender:</span><span class="value">${gender || fullPatientData?.basicInfo?.gender || 'Not provided'}</span></div>
          </div>

          <h2>Critical Medical Information</h2>
          <div class="section">
            <div class="critical">
              <h3 style="margin-top: 0; color: #dc2626;">Medical Conditions</h3>
              ${criticalConditions.length > 0 ? criticalConditions.map(c => `<div class="list-item">• ${c}</div>`).join('') : '<div class="list-item">None reported</div>'}
            </div>
            <div class="critical">
              <h3 style="margin-top: 15px; color: #dc2626;">Critical Allergies</h3>
              ${criticalAllergies.length > 0 ? criticalAllergies.map(a => `<div class="list-item">⚠ ${a}</div>`).join('') : '<div class="list-item">None reported</div>'}
            </div>
            <div>
              <h3 style="margin-top: 15px;">Current Medications</h3>
              ${currentMedications.length > 0 ? currentMedications.map(m => `<div class="list-item">• ${m}</div>`).join('') : '<div class="list-item">None reported</div>'}
            </div>
          </div>

          <h2>Emergency Contacts</h2>
          <div class="section">
            ${emergencyContact ? `
              <div class="info-row"><span class="label">Name:</span><span class="value">${emergencyContact.name || emergencyContact.n || 'Unknown'}</span></div>
              <div class="info-row"><span class="label">Relation:</span><span class="value">${emergencyContact.relation || 'Not specified'}</span></div>
              <div class="info-row"><span class="label">Phone:</span><span class="value">${emergencyContact.phone || 'Not provided'}</span></div>
              <div class="info-row"><span class="label">Email:</span><span class="value">${emergencyContact.email || 'Not provided'}</span></div>
            ` : '<p>No emergency contact provided</p>'}
          </div>

          ${primaryDoctor ? `
            <h2>Primary Doctor</h2>
            <div class="section">
              <div class="info-row"><span class="label">Name:</span><span class="value">${primaryDoctor.name || primaryDoctor.n || 'Unknown'}</span></div>
              <div class="info-row"><span class="label">Hospital:</span><span class="value">${primaryDoctor.hospital || 'Not specified'}</span></div>
              <div class="info-row"><span class="label">Contact:</span><span class="value">${primaryDoctor.contact || 'Not provided'}</span></div>
            </div>
          ` : ''}

          ${bloodInfo ? `
            <h2>Blood Compatibility</h2>
            <div class="section">
              <div class="info-row"><span class="label">Can Receive:</span><span class="value">${bloodInfo.canReceive.join(', ')}</span></div>
              <div class="info-row"><span class="label">Can Donate To:</span><span class="value">${bloodInfo.canDonate.join(', ')}</span></div>
            </div>
          ` : ''}

          ${patientData.criticalNotes ? `
            <h2>Critical Notes</h2>
            <div class="section">
              <p>${patientData.criticalNotes}</p>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emergency-medical-info-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to Excel (CSV format)
  const handleExportExcel = () => {
    const csvRows = [];
    
    // Header
    csvRows.push(['Emergency Medical Information']);
    csvRows.push(['Generated:', new Date().toLocaleString()]);
    csvRows.push(['Generated By:', 'EmHealth Emergency System']);
    csvRows.push([]);
    
    // Patient Identification
    csvRows.push(['PATIENT IDENTIFICATION']);
    csvRows.push(['Full Name', patientName]);
    csvRows.push(['Health ID', fullPatientData?.healthId || patientData.healthId || 'N/A']);
    csvRows.push(['Age', age || fullPatientData?.basicInfo?.age || 'Not provided']);
    csvRows.push(['Blood Group', bloodGroup]);
    csvRows.push(['Gender', gender || fullPatientData?.basicInfo?.gender || 'Not provided']);
    csvRows.push([]);
    
    // Critical Medical Information
    csvRows.push(['CRITICAL MEDICAL INFORMATION']);
    csvRows.push(['Medical Conditions']);
    if (criticalConditions.length > 0) {
      criticalConditions.forEach(c => csvRows.push(['', c]));
    } else {
      csvRows.push(['', 'None reported']);
    }
    csvRows.push([]);
    
    csvRows.push(['Critical Allergies']);
    if (criticalAllergies.length > 0) {
      criticalAllergies.forEach(a => csvRows.push(['', a]));
    } else {
      csvRows.push(['', 'None reported']);
    }
    csvRows.push([]);
    
    csvRows.push(['Current Medications']);
    if (currentMedications.length > 0) {
      currentMedications.forEach(m => csvRows.push(['', m]));
    } else {
      csvRows.push(['', 'None reported']);
    }
    csvRows.push([]);
    
    // Emergency Contacts
    csvRows.push(['EMERGENCY CONTACTS']);
    if (emergencyContact) {
      csvRows.push(['Name', emergencyContact.name || emergencyContact.n || 'Unknown']);
      csvRows.push(['Relation', emergencyContact.relation || 'Not specified']);
      csvRows.push(['Phone', emergencyContact.phone || 'Not provided']);
      csvRows.push(['Email', emergencyContact.email || 'Not provided']);
    } else {
      csvRows.push(['', 'No emergency contact provided']);
    }
    csvRows.push([]);
    
    // Primary Doctor
    if (primaryDoctor) {
      csvRows.push(['PRIMARY DOCTOR']);
      csvRows.push(['Name', primaryDoctor.name || primaryDoctor.n || 'Unknown']);
      csvRows.push(['Hospital', primaryDoctor.hospital || 'Not specified']);
      csvRows.push(['Contact', primaryDoctor.contact || 'Not provided']);
      csvRows.push([]);
    }
    
    // Blood Compatibility
    if (bloodInfo) {
      csvRows.push(['BLOOD COMPATIBILITY']);
      csvRows.push(['Can Receive', bloodInfo.canReceive.join(', ')]);
      csvRows.push(['Can Donate To', bloodInfo.canDonate.join(', ')]);
      csvRows.push([]);
    }
    
    // Critical Notes
    if (patientData.criticalNotes) {
      csvRows.push(['CRITICAL NOTES']);
      csvRows.push(['', patientData.criticalNotes]);
    }
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emergency-medical-info-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    // Format patient data in a clean, readable structure
    const formattedData = {
      // Header Information
      documentInfo: {
        type: "Emergency Medical Information",
        generatedAt: new Date().toISOString(),
        generatedBy: "EmHealth Emergency System",
        version: "1.0"
      },
      
      // Patient Identification
      patientIdentification: {
        fullName: patientName,
        patientId: fullPatientData?.healthId || patientData.healthId || 'N/A',
        age: age || fullPatientData?.basicInfo?.age || 'Not provided',
        bloodGroup: bloodGroup,
        gender: gender || fullPatientData?.basicInfo?.gender || 'Not provided'
      },
      
      // Critical Medical Information
      criticalMedicalInfo: {
        medicalConditions: criticalConditions.length > 0 ? criticalConditions : ['None reported'],
        criticalAllergies: criticalAllergies.length > 0 ? criticalAllergies : ['None reported'],
        currentMedications: currentMedications.length > 0 ? currentMedications : ['None reported']
      },
      
      // Emergency Contacts
      emergencyContacts: emergencyContact ? [{
        name: emergencyContact.name || emergencyContact.n || 'Unknown',
        relation: emergencyContact.relation || 'Not specified',
        phone: emergencyContact.phone || 'Not provided',
        email: emergencyContact.email || 'Not provided'
      }] : ['No emergency contact provided'],
      
      // Primary Doctor
      primaryDoctor: primaryDoctor ? {
        name: primaryDoctor.name || primaryDoctor.n || 'Unknown',
        hospital: primaryDoctor.hospital || 'Not specified',
        contact: primaryDoctor.contact || 'Not provided',
        email: primaryDoctor.email || 'Not provided'
      } : null,
      
      // Additional Information
      additionalInfo: {
        criticalNotes: patientData.criticalNotes || 'None',
        scanTimestamp: patientData.ts || new Date().toISOString(),
        priorityLevel: priority,
        alerts: alerts.length > 0 ? alerts.map(a => a.message) : ['No critical alerts']
      },
      
      // Blood Compatibility (if available)
      bloodCompatibility: bloodInfo ? {
        canReceive: bloodInfo.canReceive,
        canDonate: bloodInfo.canDonate,
        message: bloodInfo.message
      } : null,
      
      // Emergency Protocols (if available)
      emergencyProtocols: protocols.length > 0 ? protocols.map(p => ({
        title: p.title,
        steps: p.steps
      })) : [],
      
      // Raw Data (for technical reference)
      rawData: {
        note: "Raw QR scan data - for technical reference only",
        data: patientData
      }
    };
    
    // Convert to formatted JSON string
    const dataStr = JSON.stringify(formattedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emergency-medical-info-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const contactActions = getEmergencyContactActions(emergencyContact);

  // Fetch full patient data using authId
  const fetchFullPatientData = async () => {
    if (!authId || fullPatientData) return;
    
    try {
      setLoadingFullData(true);
      const response = await apiClient.get(`/api/qr/data/${authId}`, {
        authId
      });

      if (response && response.data) {
        setFullPatientData(response.data);
        setShowMoreInfo(true);
      } else {
        console.error('Failed to fetch full patient data');
      }
    } catch (error) {
      console.error('Error fetching full patient data:', error);
    } finally {
      setLoadingFullData(false);
    }
  };

  const handleMoreInfoClick = () => {
    if (!showMoreInfo && !fullPatientData) {
      fetchFullPatientData();
    } else {
      setShowMoreInfo(!showMoreInfo);
    }
  };

  return (
    <div className={styles.emergencyView}>
      {/* Priority Banner */}
      {priority !== 'normal' && (
        <div 
          className={styles.priorityBanner}
          style={{ 
            backgroundColor: priorityColor.bg,
            borderColor: priorityColor.border,
            color: priorityColor.text
          }}
        >
          <Emergency style={{ fontSize: '24px' }} />
          <div className={styles.priorityContent}>
            <h3>{priorityColor.icon} {priority.toUpperCase()} PRIORITY PATIENT</h3>
            <p>Immediate attention required</p>
          </div>
        </div>
      )}

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className={styles.alertsSection}>
          <h4 className={styles.sectionTitle}>
            <Warning style={{ color: '#dc2626' }} />
            Critical Alerts
          </h4>
          <div className={styles.alertsGrid}>
            {alerts.map((alert, index) => (
              <div 
                key={index} 
                className={`${styles.alertCard} ${styles[alert.severity]}`}
              >
                <span className={styles.alertIcon}>{alert.icon}</span>
                <span className={styles.alertMessage}>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time-Critical Information - Prominent Display */}
      <div className={styles.timeCriticalSection}>
        <h4 className={styles.sectionTitle}>
          <Emergency style={{ color: '#dc2626' }} />
          Time-Critical Information
        </h4>
        
        <div className={styles.criticalInfoGrid}>
          {/* Blood Type - LARGEST */}
          <div className={styles.bloodTypeCard}>
            <div className={styles.bloodTypeIcon}>
              <Bloodtype style={{ fontSize: '64px', color: '#dc2626' }} />
            </div>
            <div className={styles.bloodTypeInfo}>
              <div className={styles.bloodTypeLabel}>Blood Type</div>
              <div className={styles.bloodTypeValue}>{bloodGroup}</div>
              {bloodInfo && (
                <div className={styles.bloodTypeDetails}>
                  {bloodInfo.universalDonor && (
                    <span className={styles.universalBadge}>Universal Donor</span>
                  )}
                  {bloodInfo.universalRecipient && (
                    <span className={styles.universalBadge}>Universal Recipient</span>
                  )}
                  {bloodInfo.rarity === 'rare' && (
                    <span className={styles.rareBadge}>Rare Type</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Critical Allergies - LARGE */}
          {criticalAllergies.length > 0 && (
            <div className={styles.allergiesCard}>
              <div className={styles.cardHeader}>
                <Warning style={{ fontSize: '32px', color: '#dc2626' }} />
                <span className={styles.cardTitle}>Critical Allergies</span>
              </div>
              <div className={styles.allergiesList}>
                {criticalAllergies.map((allergy, index) => (
                  <div key={index} className={styles.allergyItem}>
                    <span className={styles.allergyIcon}>
                      <Warning style={{ fontSize: '18px', color: '#dc2626' }} />
                    </span>
                    <span className={styles.allergyText}>{allergy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Name & Age */}
          <div className={styles.patientInfoCard}>
            <div className={styles.patientName}>{patientName}</div>
            {age && <div className={styles.patientAge}>Age: {age}</div>}
            <div className={styles.patientId}>Health ID: {patientData.healthId || fullPatientData?.healthId || 'N/A'}</div>
          </div>

          {/* Primary Doctor - Prominent Display */}
          {primaryDoctor && (
            <div className={styles.primaryDoctorCard}>
              <div className={styles.cardHeader}>
                <Person style={{ fontSize: '24px', color: '#3b82f6' }} />
                <span className={styles.cardTitle}>Primary Doctor</span>
              </div>
              <div className={styles.doctorInfo}>
                <div className={styles.doctorName}>{primaryDoctor.name || primaryDoctor.n}</div>
                {primaryDoctor.hospital && (
                  <div className={styles.doctorHospital}>{primaryDoctor.hospital}</div>
                )}
                {primaryDoctor.contact && (
                  <a 
                    href={`tel:${primaryDoctor.contact.replace(/\D/g, '')}`}
                    className={styles.doctorContact}
                  >
                    <Phone style={{ fontSize: '16px', marginRight: '4px' }} />
                    {primaryDoctor.contact}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Medical Conditions - Prominent if exists */}
          {criticalConditions.length > 0 && (
            <div className={styles.conditionsCard}>
              <div className={styles.cardHeader}>
                <LocalHospital style={{ fontSize: '24px', color: '#dc2626' }} />
                <span className={styles.cardTitle}>Medical Conditions</span>
              </div>
              <div className={styles.conditionsList}>
                {criticalConditions.map((condition, index) => (
                  <div key={index} className={styles.conditionItem}>
                    <LocalHospital style={{ fontSize: '16px', marginRight: '8px' }} />
                    {condition}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blood Compatibility Checker */}
      {bloodInfo && (
        <div className={styles.bloodCompatibilitySection}>
          <h4 className={styles.sectionTitle}>
            <Bloodtype style={{ color: '#dc2626' }} />
            Blood Compatibility
          </h4>
          <div className={styles.compatibilityInfo}>
            <div className={styles.compatibilityRow}>
              <span className={styles.compatibilityLabel}>Can Receive:</span>
              <div className={styles.compatibilityValues}>
                {bloodInfo.canReceive.map((type, index) => (
                  <span key={index} className={styles.compatibilityBadge}>{type}</span>
                ))}
              </div>
            </div>
            <div className={styles.compatibilityRow}>
              <span className={styles.compatibilityLabel}>Can Donate To:</span>
              <div className={styles.compatibilityValues}>
                {bloodInfo.canDonate.map((type, index) => (
                  <span key={index} className={styles.compatibilityBadge}>{type}</span>
                ))}
              </div>
            </div>
            {bloodInfo.message && (
              <div className={styles.compatibilityMessage}>
                <Info style={{ fontSize: '16px', marginRight: '8px' }} />
                {bloodInfo.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Protocols */}
      {protocols.length > 0 && (
        <div className={styles.protocolsSection}>
          <h4 className={styles.sectionTitle}>
            <LocalHospital style={{ color: '#3b82f6' }} />
            Emergency Protocols
          </h4>
          <div className={styles.protocolsList}>
            {protocols.map((protocol, index) => (
              <div key={index} className={styles.protocolCard}>
                <div className={styles.protocolHeader}>
                  <span className={styles.protocolIcon}>{protocol.icon}</span>
                  <h5 className={styles.protocolTitle}>{protocol.title}</h5>
                </div>
                <ol className={styles.protocolSteps}>
                  {protocol.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className={styles.protocolStep}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Medications */}
      {currentMedications.length > 0 && (
        <div className={styles.medicationsSection}>
          <h4 className={styles.sectionTitle}>
            <Medication style={{ color: '#8b5cf6' }} />
            Current Medications
          </h4>
          <div className={styles.medicationsList}>
            {currentMedications.map((med, index) => (
              <div key={index} className={styles.medicationItem}>
                <Medication style={{ fontSize: '20px', marginRight: '8px' }} />
                <span>{med}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Contact - Auto-Dial */}
      {emergencyContact && (
        <div className={styles.emergencyContactSection}>
          <h4 className={styles.sectionTitle}>
            <ContactPhone style={{ color: '#10b981' }} />
            Emergency Contact
          </h4>
          <div className={styles.emergencyContactCard}>
            <div className={styles.contactInfo}>
              <div className={styles.contactName}>
                {emergencyContact.name || emergencyContact.n || 'Emergency Contact'}
              </div>
              {emergencyContact.relation && (
                <div className={styles.contactRelation}>
                  {emergencyContact.relation}
                </div>
              )}
            </div>
            <div className={styles.contactActions}>
              {contactActions.map((action, index) => (
                <a
                  key={index}
                  href={action.url}
                  className={styles.contactActionBtn}
                  style={{
                    backgroundColor: action.type === 'call' ? '#10b981' : 
                                    action.type === 'sms' ? '#3b82f6' : '#8b5cf6'
                  }}
                >
                  <span className={styles.actionIcon}>{action.icon}</span>
                  <span>{action.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Additional Information */}
      <div className={styles.additionalInfoSection}>
        <button 
          className={styles.toggleButton}
          onClick={() => setShowAllInfo(!showAllInfo)}
        >
          {showAllInfo ? 'Hide' : 'Show'} Additional Information
          <span className={styles.toggleIcon}>{showAllInfo ? '▲' : '▼'}</span>
        </button>

        {showAllInfo && (
          <div className={styles.additionalInfoContent}>
            {/* Critical Conditions */}
            {criticalConditions.length > 0 && (
              <div className={styles.infoSubsection}>
                <h5>Medical Conditions</h5>
                <div className={styles.conditionsList}>
                  {criticalConditions.map((condition, index) => (
                    <div key={index} className={styles.conditionItem}>
                      <LocalHospital style={{ fontSize: '16px', marginRight: '8px' }} />
                      {condition}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {patientData.criticalNotes && (
              <div className={styles.infoSubsection}>
                <h5>Critical Notes</h5>
                <p className={styles.criticalNotes}>{patientData.criticalNotes}</p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* More Info Button - Fetch Full Patient Data */}
      {authId && (
        <div className={styles.moreInfoSection}>
          <button 
            className={styles.moreInfoButton}
            onClick={handleMoreInfoClick}
            disabled={loadingFullData}
          >
            {loadingFullData ? (
              <>
                <Info style={{ marginRight: '8px' }} />
                Loading...
              </>
            ) : showMoreInfo ? (
              <>
                <ExpandLess style={{ marginRight: '8px' }} />
                Hide Full Medical History
              </>
            ) : (
              <>
                <ExpandMore style={{ marginRight: '8px' }} />
                More Info (Full Medical History)
              </>
            )}
          </button>

          {showMoreInfo && fullPatientData && (
            <div className={styles.fullPatientData}>
              {/* Basic Patient Information */}
              <div className={styles.infoSubsection}>
                <h5>Patient Information</h5>
                <div className={styles.conditionsList}>
                  <div className={styles.conditionItem}>
                    <Person style={{ fontSize: '16px', marginRight: '8px' }} />
                    <div>
                      <strong>Age:</strong> {fullPatientData.basicInfo?.age || age || 'Not provided'}
                    </div>
                  </div>
                  <div className={styles.conditionItem}>
                    <Person style={{ fontSize: '16px', marginRight: '8px' }} />
                    <div>
                      <strong>Gender:</strong> {fullPatientData.basicInfo?.gender || gender || 'Not provided'}
                    </div>
                  </div>
                  {fullPatientData.basicInfo?.contact?.email && (
                    <div className={styles.conditionItem}>
                      <Email style={{ fontSize: '16px', marginRight: '8px' }} />
                      <div>
                        <strong>Email:</strong> {fullPatientData.basicInfo.contact.email}
                      </div>
                    </div>
                  )}
                  {fullPatientData.basicInfo?.contact?.phone && (
                    <div className={styles.conditionItem}>
                      <Phone style={{ fontSize: '16px', marginRight: '8px' }} />
                      <div>
                        <strong>Phone:</strong> {fullPatientData.basicInfo.contact.phone}
                      </div>
                    </div>
                  )}
                  {fullPatientData.basicInfo?.address && (
                    <div className={styles.conditionItem}>
                      <Person style={{ fontSize: '16px', marginRight: '8px' }} />
                      <div>
                        <strong>Address:</strong> {[
                          fullPatientData.basicInfo.address.street,
                          fullPatientData.basicInfo.address.city,
                          fullPatientData.basicInfo.address.county,
                          fullPatientData.basicInfo.address.country
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Medical History */}
              {fullPatientData.medicalInfo?.medicalConditions && fullPatientData.medicalInfo.medicalConditions.length > 0 && (
                <div className={styles.infoSubsection}>
                  <h5>Complete Medical Conditions</h5>
                  <div className={styles.conditionsList}>
                    {fullPatientData.medicalInfo.medicalConditions.map((condition, index) => (
                      <div key={index} className={styles.conditionItem}>
                        <LocalHospital style={{ fontSize: '16px', marginRight: '8px' }} />
                        <div>
                          <strong>{condition.condition}</strong>
                          {condition.status && <span className={styles.conditionStatus}> ({condition.status})</span>}
                          {condition.diagnosedDate && (
                            <div className={styles.conditionDate}>
                              Diagnosed: {new Date(condition.diagnosedDate).toLocaleDateString()}
                            </div>
                          )}
                          {condition.treatment && (
                            <div className={styles.conditionTreatment}>Treatment: {condition.treatment}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Family Medical History */}
              {fullPatientData.medicalInfo?.familyMedicalHistory && fullPatientData.medicalInfo.familyMedicalHistory.length > 0 && (
                <div className={styles.infoSubsection}>
                  <h5>Family Medical History</h5>
                  <div className={styles.conditionsList}>
                    {fullPatientData.medicalInfo.familyMedicalHistory.map((history, index) => (
                      <div key={index} className={styles.conditionItem}>
                        <Person style={{ fontSize: '16px', marginRight: '8px' }} />
                        <div>
                          <strong>{history.relation}:</strong> {history.condition}
                          {history.ageDiagnosed && <span> (Diagnosed at age {history.ageDiagnosed})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immunizations */}
              {fullPatientData.medicalInfo?.immunizations && fullPatientData.medicalInfo.immunizations.length > 0 && (
                <div className={styles.infoSubsection}>
                  <h5>Immunizations</h5>
                  <div className={styles.conditionsList}>
                    {fullPatientData.medicalInfo.immunizations.map((immunization, index) => (
                      <div key={index} className={styles.conditionItem}>
                        <CheckCircle style={{ fontSize: '16px', marginRight: '8px', color: '#10b981' }} />
                        <div>
                          <strong>{immunization.vaccine}</strong>
                          {immunization.date && (
                            <span className={styles.conditionDate}>
                              {' '}- {new Date(immunization.date).toLocaleDateString()}
                            </span>
                          )}
                          {immunization.status && (
                            <span className={styles.conditionStatus}> ({immunization.status})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Surgeries */}
              {fullPatientData.medicalInfo?.surgeries && fullPatientData.medicalInfo.surgeries.length > 0 && (
                <div className={styles.infoSubsection}>
                  <h5>Surgeries</h5>
                  <div className={styles.conditionsList}>
                    {fullPatientData.medicalInfo.surgeries.map((surgery, index) => (
                      <div key={index} className={styles.conditionItem}>
                        <LocalHospital style={{ fontSize: '16px', marginRight: '8px' }} />
                        <div>
                          <strong>{surgery.type}</strong>
                          {surgery.date && (
                            <span className={styles.conditionDate}>
                              {' '}- {new Date(surgery.date).toLocaleDateString()}
                            </span>
                          )}
                          {surgery.hospital && <div className={styles.conditionTreatment}>Hospital: {surgery.hospital}</div>}
                          {surgery.notes && <div className={styles.conditionTreatment}>{surgery.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insurance */}
              {fullPatientData.medicalInfo?.insurance && (
                <div className={styles.infoSubsection}>
                  <h5>Insurance Information</h5>
                  <div className={styles.insuranceInfo}>
                    <div><strong>Provider:</strong> {fullPatientData.medicalInfo.insurance.provider}</div>
                    {fullPatientData.medicalInfo.insurance.policyNumber && (
                      <div><strong>Policy Number:</strong> {fullPatientData.medicalInfo.insurance.policyNumber}</div>
                    )}
                    {fullPatientData.medicalInfo.insurance.coverage && (
                      <div><strong>Coverage:</strong> {fullPatientData.medicalInfo.insurance.coverage}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Lifestyle */}
              {fullPatientData.medicalInfo?.lifestyle && (
                <div className={styles.infoSubsection}>
                  <h5>Lifestyle Information</h5>
                  <div className={styles.lifestyleInfo}>
                    <div><strong>Smoking:</strong> {fullPatientData.medicalInfo.lifestyle.smoking}</div>
                    <div><strong>Alcohol:</strong> {fullPatientData.medicalInfo.lifestyle.alcohol}</div>
                    <div><strong>Exercise:</strong> {fullPatientData.medicalInfo.lifestyle.exercise}</div>
                    <div><strong>Diet:</strong> {fullPatientData.medicalInfo.lifestyle.diet}</div>
                    <div><strong>Sleep:</strong> {fullPatientData.medicalInfo.lifestyle.sleep}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button className={styles.printBtn} onClick={handlePrint}>
          <Print />
          Print
        </button>
        <div className={styles.downloadMenu}>
          <button className={styles.downloadBtn} onClick={handleDownload}>
            <Download />
            Download
          </button>
          <div className={styles.downloadDropdown}>
            <button onClick={handleDownload} className={styles.downloadOption}>
              <Download />
              JSON
            </button>
            <button onClick={handleExportPDF} className={styles.downloadOption}>
              <PictureAsPdf />
              PDF
            </button>
            <button onClick={handleExportDOC} className={styles.downloadOption}>
              <Description />
              Word (DOC)
            </button>
            <button onClick={handleExportExcel} className={styles.downloadOption}>
              <TableChart />
              Excel (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Unconscious Patient Mode Indicator */}
      {isUnconscious && (
        <div className={styles.unconsciousMode}>
          <Info style={{ fontSize: '20px', marginRight: '8px' }} />
          <span>Unconscious Patient Mode - Critical information only</span>
        </div>
      )}
    </div>
  );
};

export default EmergencyPatientView;

