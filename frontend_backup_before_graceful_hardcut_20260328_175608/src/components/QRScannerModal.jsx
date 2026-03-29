import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import styles from "./QRScannerModal.module.css";
import {
  QrCodeScanner,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  CameraAlt,
  StopCircle,
  PlayArrow,
  LocalHospital,
  Person,
  Bloodtype,
  Warning,
  ContactPhone,
  Info,
  MedicalServices,
  Emergency,
  ViewModule,
  Upload,
} from "@mui/icons-material";
import EmergencyPatientView from "./EmergencyPatientView";
import { savePatientToCache } from "../utils/offlineCache";
import { calculatePriority, playAlertSound } from "../utils/emergencyUtils";

// Simple encryption key (in production, use environment variables)
const ENCRYPTION_KEY = 'emhealth-qr-encryption-key-32chars!';

const QRScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const permissionGrantedRef = useRef(false); // Track if permission was granted in this session
  
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [viewMode, setViewMode] = useState('emergency'); // 'emergency' or 'standard'
  const [isUnconscious, setIsUnconscious] = useState(false);
  const [priority, setPriority] = useState('normal');
  const fileInputRef = useRef(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Simple decryption function
  const decryptQRData = useCallback((encryptedData) => {
    try {
      // Check if it's our encrypted format
      if (!encryptedData.e || !encryptedData.i || !encryptedData.a) {
        return null; // Not our encrypted format
      }

      //  we'll use a simple base64 decode since we're using simple encryption
      try {
        const decodedData = atob(encryptedData.e);
        const decrypted = JSON.parse(decodedData);
        
        // Verify it has our expected structure
        if (decrypted.n || decrypted.bg || decrypted.id) {
          return decrypted;
        }
        return null;
      } catch (e) {
        console.error('Decryption failed:', e);
        return null;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }, []);

  // Play success sound - MUST be defined before handleScanSuccess
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Sound is optional
    }
  }, []);

  // Handle successful scan - defined before handleFileUpload
  const handleScanSuccess = useCallback((code) => {
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(code.data);
        
        // Check if it's encrypted data (our format)
        if (parsedData.e && parsedData.i && parsedData.a && parsedData.v) {
          // This is our encrypted format - decrypt it
          const decryptedData = decryptQRData(parsedData);
          if (decryptedData) {
            setScanResult(decryptedData);
            setIsScanning(false);

            // Stop scanning interval
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current);
              scanIntervalRef.current = null;
            }

            // Calculate priority and play alerts
            const priorityResult = calculatePriority(decryptedData);
            setPriority(priorityResult.priority);
            if (priorityResult.priority === 'critical') {
              playAlertSound('critical');
            } else if (priorityResult.priority === 'caution') {
              playAlertSound('caution');
            }

            // Save to offline cache
            savePatientToCache(decryptedData);

            // Call success callback if provided
            if (onScanSuccess) {
              onScanSuccess(decryptedData);
            }

            // Play success sound
            playSuccessSound();
          } else {
            setError('Invalid medical QR code - cannot decrypt');
          }
          return;
        }
      } catch {
        // Not JSON or our encrypted format
        parsedData = { raw: code.data };
      }

      // If we get here, it's not our encrypted medical QR
      setError('This is not a valid medical emergency QR code. Please scan a QR code generated by EmHealth.');
      
    } catch (error) {
      setError('Error processing scan result');
    }
  }, [decryptQRData, onScanSuccess, calculatePriority, playAlertSound, savePatientToCache, playSuccessSound]);

  // Handle file upload and QR code extraction
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    setIsProcessingFile(true);
    setError(null);

    try {
      // Create image element
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // Create canvas to process image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data for QR detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Attempt QR code detection
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });

          if (code) {
            // QR code found - process it
            handleScanSuccess({ data: code.data });
          } else {
            setError('No QR code found in the uploaded image. Please ensure the image contains a valid QR code.');
          }
          
          setIsProcessingFile(false);
        };

        img.onerror = () => {
          setError('Failed to load image. Please try another file.');
          setIsProcessingFile(false);
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
        setIsProcessingFile(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error processing file. Please try again.');
      setIsProcessingFile(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleScanSuccess]);

  // Draw scan overlay
  const drawScanOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;
    
    if (!overlayCanvas || !video) return;

    const ctx = overlayCanvas.getContext('2d');
    overlayCanvas.width = video.offsetWidth || 400;
    overlayCanvas.height = video.offsetHeight || 300;
    
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Draw scan area
    const centerX = overlayCanvas.width / 2;
    const centerY = overlayCanvas.height / 2;
    const size = Math.min(overlayCanvas.width, overlayCanvas.height) * 0.6;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Clear scan area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(centerX - size / 2, centerY - size / 2, size, size);
    ctx.globalCompositeOperation = 'source-over';

    // Corner markers
    const cornerLength = 30;
    const cornerWidth = 4;
    ctx.strokeStyle = isScanning ? '#10b981' : '#ef4444';
    ctx.lineWidth = cornerWidth;
    
    const corners = [
      { x: centerX - size / 2, y: centerY - size / 2 },
      { x: centerX + size / 2, y: centerY - size / 2 },
      { x: centerX - size / 2, y: centerY + size / 2 },
      { x: centerX + size / 2, y: centerY + size / 2 }
    ];

    corners.forEach((corner, index) => {
      ctx.beginPath();
      if (index === 0) {
        ctx.moveTo(corner.x, corner.y + cornerLength);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x + cornerLength, corner.y);
      } else if (index === 1) {
        ctx.moveTo(corner.x - cornerLength, corner.y);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y + cornerLength);
      } else if (index === 2) {
        ctx.moveTo(corner.x, corner.y - cornerLength);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x + cornerLength, corner.y);
      } else {
        ctx.moveTo(corner.x - cornerLength, corner.y);
        ctx.lineTo(corner.x, corner.y);
        ctx.lineTo(corner.x, corner.y - cornerLength);
      }
      ctx.stroke();
    });

    // Scanning line animation
    if (isScanning) {
      const time = Date.now() % 2000;
      const lineY = centerY - size / 2 + (time / 2000) * size;
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - size / 2, lineY);
      ctx.lineTo(centerX + size / 2, lineY);
      ctx.stroke();
      
      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#3b82f6';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [isScanning]);

  // Scanning loop - now defined after handleScanSuccess and drawScanOverlay
  const startScanningLoop = useCallback(() => {
    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    // Wait a bit to ensure video is ready
    const startLoop = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }

      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        const video = videoRef.current;

        if (video.readyState >= video.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
          // Update canvas dimensions
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          try {
            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get image data for QR detection
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            
            // Attempt QR code detection
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert"
            });

            if (code) {
              handleScanSuccess(code);
            }

            // Draw overlay
            drawScanOverlay();
          } catch (processError) {
            console.error('Error processing frame:', processError);
          }
        }
      }, 100);
    };

    // Start immediately and also after a short delay to ensure video is ready
    startLoop();
    setTimeout(startLoop, 300);
  }, [handleScanSuccess, drawScanOverlay]);

  // Check if device is mobile
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setScanResult(null);
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera access is not supported on this device or browser.");
        return;
      }

      const constraints = {
        video: {
          facingMode: isMobileDevice ? "environment" : "user",
          width: { ideal: isMobileDevice ? 1280 : 1920 },
          height: { ideal: isMobileDevice ? 720 : 1080 }
        }
      };

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setHasCameraPermission(true);
      permissionGrantedRef.current = true; // Mark permission as granted
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video timeout'));
          }, 5000);
          
          if (videoRef.current.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            videoRef.current.onloadedmetadata = () => {
              clearTimeout(timeout);
              resolve();
            };
            videoRef.current.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Video load error'));
            };
          }
        });
        
        await videoRef.current.play();
        setIsScanning(true);
        
        // Start scanning loop after video is playing
        setTimeout(() => {
          startScanningLoop();
        }, 200);
      }
    } catch (err) {
      setIsScanning(false);
      setHasCameraPermission(false);
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        // Permission was denied - reset the ref so we show permission button again
        permissionGrantedRef.current = false;
        setError("Camera permission denied. Please allow camera access in your browser settings and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera found on this device.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("Camera is already in use by another application. Please close other apps using the camera.");
      } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
        setError("Camera constraints not satisfied. Trying with default settings...");
        // Try again with simpler constraints
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          permissionGrantedRef.current = true; // Mark permission as granted
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            await videoRef.current.play();
            setIsScanning(true);
            setTimeout(() => {
              startScanningLoop();
            }, 200);
          }
        } catch (retryErr) {
          setError(`Camera error: ${retryErr.message}`);
        }
      } else {
        setError(`Camera error: ${err.message || 'Unknown error occurred'}`);
      }
    }
  }, [startScanningLoop, isMobileDevice]);

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    
    // Clear scanning interval first to stop any ongoing scans
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Stop all video tracks and release camera
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (err) {
          console.warn('Error stopping track:', err);
        }
      });
      videoRef.current.srcObject = null;
    }
    
    // Pause and clear video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        // Clear video source to ensure it's fully stopped
        videoRef.current.load();
      } catch (err) {
        console.warn('Error clearing video:', err);
      }
    }
    
    // Clear canvas overlays
    if (canvasRef.current) {
      try {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (err) {
        console.warn('Error clearing canvas:', err);
      }
    }
    
    if (overlayCanvasRef.current) {
      try {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      } catch (err) {
        console.warn('Error clearing overlay canvas:', err);
      }
    }
    
    // Update state - keep hasCameraPermission true since permission is still granted
    // Only set isScanning to false so "Start Scanner" button shows instead of permission prompt
    setIsScanning(false);
    // Don't reset hasCameraPermission - permission is still granted, just camera is stopped
    // This way user can click "Start Scanner" again without permission prompt
    
    // Clear any errors when stopping
    setError(null);
    
    console.log('Camera stopped successfully');
  }, []);

  // Reset scanner
  const resetScanner = useCallback(() => {
    // Clear scan result and errors
    setScanResult(null);
    setError(null);
    
    // Stop camera first to ensure clean restart
    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Stop any existing video tracks
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (err) {
          console.warn('Error stopping track during reset:', err);
        }
      });
      videoRef.current.srcObject = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (err) {
        console.warn('Error clearing video during reset:', err);
      }
    }
    
    // Reset state
    setIsScanning(false);
    
    // Small delay to ensure cleanup is complete before starting camera
    setTimeout(() => {
      startCamera();
    }, 150);
  }, [startCamera]);

  // Enhanced medical data display
  const MedicalDataDisplay = ({ data }) => {
    if (!data || typeof data !== 'object') {
      return (
        <div className={styles.rawDataSection}>
          <Info style={{ fontSize: '48px', color: '#cbd5e1' }} />
          <p className={styles.rawDataText}>Unable to display medical data</p>
        </div>
      );
    }

    return (
      <div className={styles.medicalDataContainer}>
        {/* Patient Basic Info */}
        {(data.n || data.fullName) && (
          <div className={styles.dataSection}>
            <div className={styles.sectionHeader}>
              <Person style={{ color: '#3b82f6' }} />
              <h4>Patient Information</h4>
            </div>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Name</span>
                <span className={styles.dataValue}>{data.n || data.fullName}</span>
              </div>
              {data.bg && (
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>Blood Group</span>
                  <span className={`${styles.dataValue} ${styles.bloodType}`}>
                    <Bloodtype style={{ fontSize: '16px' }} />
                    {data.bg}
                  </span>
                </div>
              )}
              {data.age && (
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>Age</span>
                  <span className={styles.dataValue}>{data.age} years</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medical Information */}
        {(data.alg || data.med) && (
          <div className={styles.dataSection}>
            <div className={styles.sectionHeader}>
              <LocalHospital style={{ color: '#ef4444' }} />
              <h4>Medical Information</h4>
            </div>
            {data.alg && data.alg.length > 0 && (
              <div className={styles.criticalInfo}>
                <Warning style={{ color: '#dc2626', fontSize: '20px' }} />
                <div className={styles.criticalContent}>
                  <span className={styles.dataLabel}>Critical Allergies</span>
                  <div className={styles.allergyTags}>
                    {(Array.isArray(data.alg) ? data.alg : [data.alg]).map((allergy, i) => (
                      <span key={i} className={styles.allergyTag}>{allergy}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {data.med && data.med.length > 0 && (
              <div className={styles.medicationInfo}>
                <span className={styles.dataLabel}>Current Medications</span>
                <div className={styles.medicationList}>
                  {(Array.isArray(data.med) ? data.med : [data.med]).map((med, i) => (
                    <span key={i} className={styles.medicationTag}>{med}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Doctor */}
        {data.doc && (
          <div className={styles.dataSection}>
            <div className={styles.sectionHeader}>
              <MedicalServices style={{ color: '#8b5cf6' }} />
              <h4>Primary Doctor</h4>
            </div>
            {typeof data.doc === 'object' ? (
              <div className={styles.contactCard}>
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>Name</span>
                  <span className={styles.dataValue}>{data.doc.n || data.doc.name}</span>
                </div>
                {data.doc.h && (
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Hospital</span>
                    <span className={styles.dataValue}>{data.doc.h}</span>
                  </div>
                )}
                {data.doc.p && (
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Contact</span>
                    <span className={styles.dataValue}>
                      <a href={`tel:${data.doc.p}`} className={styles.phoneLink}>
                        {data.doc.p}
                      </a>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Doctor</span>
                <span className={styles.dataValue}>{data.doc}</span>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contact */}
        {data.ec && (
          <div className={styles.dataSection}>
            <div className={styles.sectionHeader}>
              <ContactPhone style={{ color: '#10b981' }} />
              <h4>Emergency Contact</h4>
            </div>
            {typeof data.ec === 'object' ? (
              <div className={styles.contactCard}>
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>Name</span>
                  <span className={styles.dataValue}>{data.ec.n || data.ec.name}</span>
                </div>
                <div className={styles.dataItem}>
                  <span className={styles.dataLabel}>Phone</span>
                  <span className={styles.dataValue}>
                    <a href={`tel:${data.ec.p || data.ec.phone}`} className={styles.phoneLink}>
                      {data.ec.p || data.ec.phone}
                    </a>
                  </span>
                </div>
                {data.ec.r && (
                  <div className={styles.dataItem}>
                    <span className={styles.dataLabel}>Relation</span>
                    <span className={styles.dataValue}>{data.ec.r}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.dataItem}>
                <span className={styles.dataLabel}>Contact</span>
                <span className={styles.dataValue}>{data.ec}</span>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className={styles.metadataSection}>
          <div className={styles.metadataGrid}>
            {/* Health ID will be shown in EmergencyPatientView, not here */}
            {data.ts && (
              <div className={styles.metadataItem}>
                <span className={styles.metadataLabel}>QR Generated</span>
                <span className={styles.metadataValue}>
                  {new Date(data.ts).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      // On desktop/PC, try to start camera automatically
      // On mobile, check if permission was already granted in this session
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (!isMobile) {
        // Desktop: Try to start camera automatically
        const timer = setTimeout(() => {
          startCamera();
        }, 100);
        return () => clearTimeout(timer);
      } else {
        // Mobile: Check if permission was already granted in this session
        if (permissionGrantedRef.current) {
          // Permission was already granted - try to start camera directly
          setHasCameraPermission(true);
          const timer = setTimeout(() => {
            startCamera();
          }, 100);
          return () => clearTimeout(timer);
        } else {
          // Permission not yet granted - show permission button
          setHasCameraPermission(false);
          setIsScanning(false);
          setError(null);
        }
      }
    } else {
      stopCamera();
      setScanResult(null);
      setError(null);
      setViewMode('emergency');
      setIsUnconscious(false);
      setPriority('normal');
      // Don't reset permissionGrantedRef here - keep it across modal opens
      // Only reset hasCameraPermission state
      setHasCameraPermission(false);
    }
  }, [isOpen, startCamera, stopCamera]);

  // Cleanup on unmount and when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clear interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      // Stop all video tracks
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          track.enabled = false;
        });
        videoRef.current.srcObject = null;
      }
      
      // Clear refs
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      
      if (overlayCanvasRef.current) {
        const ctx = overlayCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => {
          track.stop();
          track.enabled = false;
        });
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <QrCodeScanner style={{ fontSize: '28px', color: '#3b82f6' }} />
            <h3>Medical QR Scanner</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <Close />
          </button>
        </div>

        <div className={styles.scannerContainer}>
          {!hasCameraPermission && !isScanning ? (
            <div className={styles.permissionPrompt}>
              <CameraAlt style={{ fontSize: '64px', color: '#cbd5e1' }} />
              <h4>Camera Access Required</h4>
              <p>We need access to your camera to scan QR codes</p>
              <button 
                className={styles.grantPermissionBtn} 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startCamera();
                }}
                type="button"
              >
                <CameraAlt />
                Grant Camera Permission
              </button>
            </div>
          ) : (
            <>
              <div className={styles.videoContainer}>
                <video
                  ref={videoRef}
                  className={styles.video}
                  playsInline
                  muted
                />
                
                <canvas
                  ref={overlayCanvasRef}
                  className={styles.overlayCanvas}
                />

                <div className={`${styles.statusBadge} ${isScanning ? styles.statusScanning : styles.statusStopped}`}>
                  {isScanning ? (
                    <>
                      <span className={styles.pulseIndicator}></span>
                      Scanning...
                    </>
                  ) : (
                    <>Stopped</>
                  )}
                </div>
              </div>

              <canvas ref={canvasRef} style={{ display: "none" }} />

              {!scanResult && (
                <>
                  <div className={styles.instructions}>
                    <QrCodeScanner style={{ fontSize: '20px', color: '#64748b' }} />
                    <p>Position the medical QR code within the frame</p>
                  </div>

                  <div className={styles.controls}>
                    {isScanning ? (
                      <button 
                        className={styles.stopBtn} 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          stopCamera();
                        }}
                        type="button"
                      >
                        <StopCircle />
                        Stop Scanner
                      </button>
                    ) : (
                      <button 
                        className={styles.startBtn} 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          resetScanner();
                        }}
                        type="button"
                      >
                        <PlayArrow />
                        Start Scanner
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      id="qr-upload-input"
                    />
                    <button
                      className={styles.uploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile}
                    >
                      <Upload />
                      {isProcessingFile ? 'Processing...' : 'Upload QR Image'}
                    </button>
                  </div>
                </>
              )}

              {error && (
                <div className={styles.errorAlert}>
                  <ErrorIcon style={{ fontSize: '24px' }} />
                  <div className={styles.errorContent}>
                    <strong>Error</strong>
                    <p>{error}</p>
                  </div>
                  <button className={styles.retryBtn} onClick={resetScanner}>
                    <Refresh />
                  </button>
                </div>
              )}
            </>
          )}

          {scanResult && (
            <div className={styles.scanResultContainer}>
              <div className={styles.resultHeader}>
                <CheckCircle style={{ fontSize: '48px', color: '#10b981' }} />
                <h4>Scan Successful!</h4>
                <p>Medical information retrieved from QR code</p>
                {priority !== 'normal' && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    backgroundColor: priority === 'critical' ? '#fee2e2' : '#fef3c7',
                    border: `2px solid ${priority === 'critical' ? '#dc2626' : '#d97706'}`,
                    borderRadius: '8px',
                    color: priority === 'critical' ? '#dc2626' : '#d97706',
                    fontWeight: '700',
                    fontSize: '14px'
                  }}>
                    {priority === 'critical' ? (
                      <>
                        <ErrorIcon style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                        CRITICAL PRIORITY
                      </>
                    ) : (
                      <>
                        <Warning style={{ fontSize: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                        CAUTION
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  onClick={() => setViewMode('emergency')}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: viewMode === 'emergency' ? '#3b82f6' : 'white',
                    color: viewMode === 'emergency' ? 'white' : '#64748b',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '14px'
                  }}
                >
                  <Emergency style={{ fontSize: '18px' }} />
                  Emergency View
                </button>
                <button
                  onClick={() => setViewMode('standard')}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: viewMode === 'standard' ? '#3b82f6' : 'white',
                    color: viewMode === 'standard' ? 'white' : '#64748b',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '14px'
                  }}
                >
                  <ViewModule style={{ fontSize: '18px' }} />
                  Standard View
                </button>
              </div>

              {/* Unconscious Mode Toggle */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
                  <Info style={{ fontSize: '16px', marginRight: '8px', verticalAlign: 'middle' }} />
                  Unconscious Patient Mode
                </span>
                <button
                  onClick={() => setIsUnconscious(!isUnconscious)}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isUnconscious ? '#d97706' : '#fbbf24',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {isUnconscious ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className={styles.resultContent}>
                {viewMode === 'emergency' ? (
                  <EmergencyPatientView 
                    patientData={scanResult} 
                    isUnconscious={isUnconscious}
                  />
                ) : (
                <MedicalDataDisplay data={scanResult} />
                )}
              </div>
              
              <div className={styles.resultActions}>
                <button className={styles.scanAgainBtn} onClick={resetScanner}>
                  <Refresh />
                  Scan Another Code
                </button>
                <button className={styles.closeResultBtn} onClick={onClose}>
                  <Close />
                  Close Scanner
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;