.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modalContent {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(-30px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Modal Header */
.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 2px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: 20px 20px 0 0;
}

.headerContent {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modalHeader h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.4rem;
  font-weight: 700;
}

.closeBtn {
  background: #ef4444;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
}

.closeBtn:hover {
  background: #dc2626;
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* Scanner Container */
.scannerContainer {
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Video Container */
.videoContainer {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.video {
  width: 100%;
  height: 360px;
  object-fit: cover;
  display: block;
}

.overlayCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Status Badge */
.statusBadge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.statusScanning {
  background: rgba(16, 185, 129, 0.95);
}

.statusStopped {
  background: rgba(239, 68, 68, 0.95);
}

.pulseIndicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}

/* Permission Prompt */
.permissionPrompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 40px;
  text-align: center;
  background: #f8fafc;
  border-radius: 16px;
  border: 2px dashed #cbd5e1;
}

.permissionPrompt h4 {
  margin: 16px 0 8px 0;
  color: #1e293b;
  font-size: 1.3rem;
  font-weight: 700;
}

.permissionPrompt p {
  margin: 0 0 24px 0;
  color: #64748b;
  font-size: 1rem;
  max-width: 320px;
}

.grantPermissionBtn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.grantPermissionBtn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
}

/* Instructions */
.instructions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.instructions p {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
  font-weight: 500;
}

/* Controls */
.controls {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.startBtn,
.stopBtn,
.uploadBtn {
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 100%;
  position: relative;
  z-index: 10;
  letter-spacing: 0.3px;
}

.startBtn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.startBtn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.startBtn:active {
  transform: translateY(0);
}

.stopBtn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.stopBtn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
}

.stopBtn:active {
  transform: translateY(0);
}

/* Error Alert */
.errorAlert {
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-left: 4px solid #ef4444;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.errorContent {
  flex: 1;
}

.errorContent strong {
  color: #991b1b;
  font-size: 1rem;
  display: block;
  margin-bottom: 4px;
}

.errorContent p {
  margin: 0;
  color: #dc2626;
  font-size: 0.9rem;
  line-height: 1.5;
}

.retryBtn {
  background: #ef4444;
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.retryBtn:hover {
  background: #dc2626;
  transform: rotate(180deg);
}

/* Scan Result Container */
.scanResultContainer {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 2px solid #bbf7d0;
  border-radius: 16px;
  padding: 28px;
  animation: resultSlideUp 0.4s ease-out;
}

@keyframes resultSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.resultHeader {
  text-align: center;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 2px solid #bbf7d0;
}

.resultHeader h4 {
  margin: 12px 0 8px 0;
  color: #065f46;
  font-size: 1.5rem;
  font-weight: 700;
}

.resultHeader p {
  margin: 0;
  color: #059669;
  font-size: 1rem;
}

/* Medical Data Container */
.medicalDataContainer {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.dataSection {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
}

.sectionHeader h4 {
  margin: 0;
  color: #1e293b;
  font-size: 1.1rem;
  font-weight: 700;
}

/* Data Grid */
.dataGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.dataItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dataLabel {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dataValue {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.bloodType {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ef4444;
  font-size: 1.1rem;
}

/* Critical Info */
.criticalInfo {
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-left: 4px solid #ef4444;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.criticalContent {
  flex: 1;
}

.allergyTags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.allergyTag {
  background: #dc2626;
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Medication Info */
.medicationInfo {
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 16px;
}

.medicationList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.medicationTag {
  background: #3b82f6;
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
}

/* Contact Card */
.contactCard {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phoneLink {
  color: #10b981;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s ease;
}

.phoneLink:hover {
  color: #059669;
  text-decoration: underline;
}

/* Metadata Section */
.metadataSection {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.metadataGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metadataItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metadataLabel {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metadataValue {
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
  font-family: 'Courier New', monospace;
}

/* Raw Data Section */
.rawDataSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.rawDataText {
  margin: 12px 0 0 0;
  color: #64748b;
  font-size: 1rem;
}

/* Result Actions */
.resultActions {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 20px;
  border-top: 2px solid #bbf7d0;
}

.scanAgainBtn,
.closeResultBtn {
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.scanAgainBtn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  flex: 1;
}

.scanAgainBtn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.closeResultBtn {
  background: white;
  color: #64748b;
  border: 2px solid #cbd5e1;
  flex: 1;
}

.closeResultBtn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #475569;
  transform: translateY(-2px);
}

/* Scrollbar Styling */
.modalContent::-webkit-scrollbar {
  width: 8px;
}

.modalContent::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.modalContent::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.modalContent::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive Design */
@media (max-width: 640px) {
  .modalOverlay {
    padding: 12px;
  }
  
  .modalContent {
    max-height: 95vh;
    border-radius: 16px;
  }

  .modalHeader {
    padding: 20px 24px;
    border-radius: 16px 16px 0 0;
  }

  .modalHeader h3 {
    font-size: 1.2rem;
  }

  .closeBtn {
    width: 36px;
    height: 36px;
  }
  
  .video {
    height: 280px;
  }
  
  .scannerContainer {
    padding: 20px;
  }

  .permissionPrompt {
    padding: 40px 24px;
  }

  .grantPermissionBtn {
    width: 100%;
    justify-content: center;
  }

  .controls {
    flex-direction: column;
  }

  .startBtn,
  .stopBtn {
    width: 100%;
    justify-content: center;
  }
  
  .resultActions {
    flex-direction: column;
  }

  .scanAgainBtn,
  .closeResultBtn {
    width: 100%;
    justify-content: center;
  }

  .dataGrid,
  .metadataGrid {
    grid-template-columns: 1fr;
  }

  .scanResultContainer {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .video {
    height: 240px;
  }

  .scannerContainer {
    padding: 16px;
  }

  .resultHeader h4 {
    font-size: 1.3rem;
  }

  .sectionHeader h4 {
    font-size: 1rem;
  }
}

/* Print Styles */
@media print {
  .modalOverlay {
    position: static;
    background: white;
  }

  .modalContent {
    max-width: 100%;
    box-shadow: none;
  }

  .videoContainer,
  .controls,
  .instructions,
  .resultActions,
  .closeBtn {
    display: none;
  }

  .medicalDataContainer {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}