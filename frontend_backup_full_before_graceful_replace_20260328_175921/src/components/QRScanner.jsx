import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";

const QRScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  
  // Core states
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState(null);
  
  // Professional features
  const [scanHistory, setScanHistory] = useState(() => {
    const saved = localStorage.getItem('qr-scan-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [scanCount, setScanCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      if (videoDevices.length > 0 && !selectedCamera) {
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(backCamera || videoDevices[0]);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
    }
  }, [selectedCamera]);

  // Enhanced camera start
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      await getAvailableCameras();
      
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          ...(selectedCamera?.deviceId && { deviceId: { exact: selectedCamera.deviceId } })
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        startScanningLoop();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsScanning(false);
      
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access and refresh the page.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else if (err.name === "NotSupportedError") {
        setError("Camera not supported in this browser.");
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, [selectedCamera]);

  // Enhanced scanning loop
  const startScanningLoop = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !isScanning) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const video = videoRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: "dontInvert"
        });

        if (code) {
          handleScanSuccess(code);
        } else {
          setConfidenceLevel(0);
        }

        // Draw overlay
        drawScanOverlay();
      }
    }, 150); // Optimized scan interval
  }, [isScanning]);

  // Handle successful scan
  const handleScanSuccess = useCallback((code) => {
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(code.data);
      } catch {
        parsedData = { raw: code.data };
      }

      setScanResult(parsedData);
      setLastScanTime(new Date().toLocaleString());
      setScanCount(prev => prev + 1);
      setConfidenceLevel(100);
      setIsScanning(false);

      // Play success sound
      playSuccessSound();

      // Add to history
      const historyItem = {
        id: Date.now(),
        data: parsedData,
        timestamp: new Date().toISOString(),
        location: code.location
      };

      setScanHistory(prev => {
        const newHistory = [historyItem, ...prev].slice(0, 20); // Keep last 20 scans
        localStorage.setItem('qr-scan-history', JSON.stringify(newHistory));
        return newHistory;
      });

      // Stop scanning interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    } catch (error) {
      console.error('Error processing scan result:', error);
      setError('Error processing scan result');
    }
  }, []);

  // Draw scan overlay
  const drawScanOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;
    
    if (!overlayCanvas || !video) return;

    const ctx = overlayCanvas.getContext('2d');
    overlayCanvas.width = video.offsetWidth;
    overlayCanvas.height = video.offsetHeight;
    
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
    const cornerLength = 20;
    const cornerWidth = 3;
    ctx.strokeStyle = isScanning ? '#00ff00' : '#ff0000';
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
      
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - size / 2, lineY);
      ctx.lineTo(centerX + size / 2, lineY);
      ctx.stroke();
    }
  }, [isScanning]);

  // Play success sound
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Fallback - just log if audio fails
      console.log('Scan successful!');
    }
  }, []);

  // Toggle flashlight
  const toggleFlashlight = useCallback(async () => {
    if (!videoRef.current?.srcObject) return;

    try {
      const stream = videoRef.current.srcObject;
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashlightOn }]
        });
        setIsFlashlightOn(!isFlashlightOn);
      } else {
        setError('Flashlight not supported on this device');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Flashlight error:', err);
      setError('Failed to toggle flashlight');
      setTimeout(() => setError(null), 3000);
    }
  }, [isFlashlightOn]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    setIsScanning(false);
    setIsFlashlightOn(false);
  }, []);

  // Reset scanner
  const resetScanner = useCallback(() => {
    setScanResult(null);
    setError(null);
    setConfidenceLevel(0);
    startCamera();
  }, [startCamera]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Copied to clipboard!');
    });
  }, []);

  // Export history
  const exportHistory = useCallback(() => {
    const dataStr = JSON.stringify(scanHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-scan-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [scanHistory]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  // Restart when camera changes
  useEffect(() => {
    if (selectedCamera && isScanning) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [selectedCamera]);

  // Stop camera when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - stop camera
        if (isScanning) {
          stopCamera();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isScanning, stopCamera]);

  // Restart scanning loop when isScanning changes to true
  useEffect(() => {
    if (isScanning) {
      startScanningLoop();
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    }
  }, [isScanning, startScanningLoop]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "0"
    }}>
      {/* Header */}
      <header style={{
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        padding: "15px 20px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
        color: "white"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>
            QR Scanner Pro
          </h1>
          
          <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
            <span>Scans: {scanCount}</span>
            {lastScanTime && <span>Last: {lastScanTime.split(' ')[1]}</span>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
        {/* Camera Selection */}
        {cameras.length > 1 && (
          <div style={{
            marginBottom: "20px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "12px",
            padding: "15px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
          }}>
            <label style={{ marginRight: "10px", fontWeight: "500" }}>Camera:</label>
            <select
              value={selectedCamera?.deviceId || ''}
              onChange={(e) => {
                const camera = cameras.find(c => c.deviceId === e.target.value);
                setSelectedCamera(camera);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background: "white"
              }}
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scanner Container */}
        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
          backdropFilter: "blur(10px)",
          width: "100%",
          maxWidth: "400px",
          position: "relative"
        }}>
          {/* Video Container */}
          <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden" }}>
            <video
              ref={videoRef}
              style={{
                width: "100%",
                height: "320px",
                objectFit: "cover",
                background: "#000",
                display: "block"
              }}
              playsInline
              muted
            />
            
            {/* Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none"
              }}
            />

            {/* Status Indicator */}
            <div style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: isScanning ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "500"
            }}>
              {isScanning ? "Scanning..." : "Stopped"}
            </div>

            {/* Camera Controls */}
            <div style={{
              position: "absolute",
              bottom: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "8px"
            }}>
              <button
                onClick={toggleFlashlight}
                style={{
                  padding: "6px 10px",
                  backgroundColor: isFlashlightOn ? "#fbbf24" : "rgba(0, 0, 0, 0.6)",
                  color: "white",
                  border: "none",
                  borderRadius: "15px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "500"
                }}
              >
                {isFlashlightOn ? "Flash Off" : "Flash On"}
              </button>
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Control Buttons */}
          <div style={{
            display: "flex",
            gap: "10px",
            marginTop: "15px",
            justifyContent: "center",
            flexWrap: "wrap"
          }}>
            {isScanning ? (
              <button
                onClick={stopCamera}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Stop Scanner
              </button>
            ) : (
              <button
                onClick={resetScanner}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                Start Scanner
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              marginTop: "15px",
              padding: "12px",
              background: "#fee2e2",
              color: "#dc2626",
              borderRadius: "8px",
              fontSize: "14px",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div style={{
            marginTop: "25px",
            padding: "25px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            width: "100%",
            maxWidth: "600px",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}>
              <h3 style={{ color: "#10b981", margin: 0, fontSize: "20px", fontWeight: "600" }}>
                Scan Result ✓
              </h3>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(scanResult, null, 2))}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={resetScanner}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  Scan Again
                </button>
              </div>
            </div>

            {scanResult.name ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { label: "ID", value: scanResult.id },
                  { label: "Name", value: scanResult.name },
                  { label: "Blood Group", value: scanResult.bloodGroup },
                  { label: "Allergies", value: scanResult.allergies?.join(", ") || "None" }
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      background: "#f1f5f9",
                      padding: "12px",
                      borderRadius: "8px",
                      alignItems: "center"
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#475569" }}>{item.label}:</span>
                    <span style={{ color: "#1e293b" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <pre style={{
                background: "#1e293b",
                color: "#e2e8f0",
                padding: "15px",
                borderRadius: "8px",
                overflow: "auto",
                fontSize: "14px",
                lineHeight: "1.4",
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word"
              }}>
                {JSON.stringify(scanResult.raw || scanResult, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div style={{
            marginTop: "25px",
            padding: "20px",
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            width: "100%",
            maxWidth: "600px",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px"
            }}>
              <h4 style={{ margin: 0, color: "#374151" }}>
                Recent Scans ({scanHistory.length})
              </h4>
              <button
                onClick={exportHistory}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#0891b2",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "11px"
                }}
              >
                Export
              </button>
            </div>

            <div style={{
              maxHeight: "200px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              {scanHistory.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px",
                    background: "#f8fafc",
                    borderRadius: "6px",
                    fontSize: "13px",
                    border: "1px solid #e2e8f0"
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px"
                  }}>
                    <span style={{ fontWeight: "500", color: "#374151" }}>
                      {item.data.name || "Raw Data"}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "11px" }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{
                    color: "#6b7280",
                    fontSize: "11px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {item.data.raw || JSON.stringify(item.data).substring(0, 60) + "..."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style>
        {`
          button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
            transition: all 0.2s ease;
          }
          
          select:focus, button:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
          }
          
          @media (max-width: 640px) {
            main { padding: 15px; }
            header { padding: 10px 15px; }
            header > div { flex-direction: column; gap: 10px; text-align: center; }
          }
          
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
          ::-webkit-scrollbar-thumb { background: #888; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #555; }
        `}
      </style>
    </div>
  );
};

export default QRScanner;
