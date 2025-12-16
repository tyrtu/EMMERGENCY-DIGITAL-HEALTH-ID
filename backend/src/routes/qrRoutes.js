// src/routes/qrRoutes.js
import express from "express";
import QRCode from "qrcode";
import Patient from "../models/Patient.js";
import path from "path";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client for token verification
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Simple base64 encoding for QR data (keeping it minimal for QR code readability)
const encryptQRData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    // Use Buffer for Node.js (btoa is browser-only)
    const encrypted = Buffer.from(jsonString, 'utf8').toString('base64');
    
    // Return our format (base64 encoded for minimal size)
    return {
      e: encrypted, // base64 encoded data
      i: 'emh', // identifier
      a: 'base64', // algorithm
      v: '1.0' // format version
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('QR encoding error:', error.message);
    }
    // Fallback - return data directly (shouldn't happen, but safer)
    return {
      e: Buffer.from(JSON.stringify(data), 'utf8').toString('base64'),
      i: 'emh',
      a: 'base64',
      v: '1.0'
    };
  }
};

/**
 * @route   GET /api/qr/card-pdf/:authId
 * @desc    Generate Health ID Card PDF for a patient
 * @access  Private (users can only access their own card)
 */
router.get("/card-pdf/:authId", async (req, res) => {
  try {
    const { authId } = req.params;
    
    // Get authId from header (sent by frontend)
    const headerAuthId = req.headers['x-auth-id'];
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    // Security check: require both token and authId header
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: Token required" });
    }
    
    if (!headerAuthId) {
      return res.status(401).json({ success: false, message: "Unauthorized: authId header required" });
    }
    
    // Verify token with Supabase
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
          return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
        }
        // Verify the token's user ID matches the header authId
        if (user.id !== headerAuthId) {
          return res.status(403).json({ 
            success: false, 
            message: "Forbidden: Token does not match authId" 
          });
        }
      } catch (tokenError) {
        return res.status(401).json({ success: false, message: "Unauthorized: Token verification failed" });
      }
    }
    
    // Ensure user can only access their own card
    if (headerAuthId !== authId) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You can only access your own Health ID card" 
      });
    }

    if (!authId) {
      return res.status(400).json({ success: false, message: "authId is required" });
    }

    const patient = await Patient.findOne({ authId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const { basicInfo, emergencyInfo } = patient;

    // Generate QR code data (same as existing QR endpoint)
    const qrData = {
      n: basicInfo?.fullName,
      bg: basicInfo?.bloodGroup,
      id: patient.authId.toString(),
      alg: emergencyInfo?.criticalAllergies || [],
      med: emergencyInfo?.currentMedications || [],
      criticalConditions: emergencyInfo?.criticalConditions || [],
      ec: emergencyInfo?.primaryEmergencyContacts?.[0] || null
    };

    const filteredQrData = Object.fromEntries(
      Object.entries(qrData).filter(([_, value]) => 
        value !== undefined && value !== null
      )
    );

    const encryptedData = encryptQRData(filteredQrData);
    const qrDataString = JSON.stringify(encryptedData);

    // Generate QR code as buffer - higher quality for PDF
    const qrCodeBuffer = await QRCode.toBuffer(qrDataString, {
      errorCorrectionLevel: 'H', // Higher error correction for better scanning
      type: 'png',
      width: 500, // Higher resolution for better quality in PDF
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Verify QR code was generated
    if (!qrCodeBuffer || qrCodeBuffer.length === 0) {
      return res.status(500).json({ 
        success: false, 
        message: "Failed to generate QR code" 
      });
    }

    // Load profile photo if exists
    let profilePhotoBuffer = null;
    if (basicInfo?.profilePhoto) {
      try {
        // Extract filename from path (e.g., "/uploads/patients/filename.jpg" -> "filename.jpg")
        const photoFilename = path.basename(basicInfo.profilePhoto);
        const fullPhotoPath = path.join(process.cwd(), 'uploads', 'patients', photoFilename);
        
        if (fs.existsSync(fullPhotoPath)) {
          profilePhotoBuffer = fs.readFileSync(fullPhotoPath);
        }
      } catch (photoError) {
        console.error('Error loading profile photo:', photoError);
        // Continue without photo
      }
    }

    // Generate PDF
    // Import PDF generator lazily to avoid loading native modules (e.g., sharp) during tests
    const { generateHealthIDCardPDF } = await import("../services/pdfCardGenerator.js");
    const pdfBuffer = await generateHealthIDCardPDF(patient, qrCodeBuffer, profilePhotoBuffer);

    // Set response headers
    const healthId = patient.healthId || patient.authId?.slice(0, 8) || 'card';
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Health_ID_${healthId}.pdf"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    
    // Send PDF
    res.send(pdfBuffer);

  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ 
      success: false, 
      message: "PDF generation failed", 
      error: err.message 
    });
  }
});

/**
 * @route   GET /api/qr/:authId
 * @desc    Generate QR code for a patient by authId
 * @access  Private
 */
router.get("/:authId", async (req, res) => {
  try {
    const { authId } = req.params;
    if (!authId) {
      return res.status(400).json({ success: false, message: "authId is required" });
    }

    const patient = await Patient.findOne({ authId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const { basicInfo, emergencyInfo } = patient;

    // Minimal essential emergency information for QR code
    const qrData = {
      // Basic identification
      n: basicInfo?.fullName,
      bg: basicInfo?.bloodGroup,
      id: patient.authId.toString(),
      
      // Critical medical info
      alg: emergencyInfo?.criticalAllergies || [],
      med: emergencyInfo?.currentMedications || [],
      criticalConditions: emergencyInfo?.criticalConditions || [],
      
      // Emergency contact
      ec: emergencyInfo?.primaryEmergencyContacts?.[0] || null
    };

    // Filter out undefined/null values - keep minimal
    const filteredQrData = Object.fromEntries(
      Object.entries(qrData).filter(([_, value]) => 
        value !== undefined && value !== null
      )
    );

    // Encode the QR data (simple base64 encoding)
    const encryptedData = encryptQRData(filteredQrData);
    const qrDataString = JSON.stringify(encryptedData);

    // Validate QR data string length (QR codes have size limits)
    if (qrDataString.length > 2000) {
      return res.status(400).json({ 
        success: false, 
        message: "QR code data too large. Please reduce the amount of information." 
      });
    }

    // QR code settings
    const qrOptions = {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 400,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    // Set response headers
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="medical-qr-${authId}.png"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    
    // Generate QR code
    QRCode.toFileStream(res, qrDataString, qrOptions);

  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ success: false, message: "QR generation failed", error: err.message });
  }
});

/**
 * @route   GET /api/qr/data/:authId
 * @desc    Get QR code display data for frontend
 * @access  Private
 */
router.get("/data/:authId", async (req, res) => {
  try {
    const { authId } = req.params;
    if (!authId) {
      return res.status(400).json({ success: false, message: "authId is required" });
    }

    const patient = await Patient.findOne({ authId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const { basicInfo, emergencyInfo, medicalInfo, qrMetadata } = patient;

    // Complete display data for frontend QR section
    const displayData = {
      // Basic Information
      basicInfo: {
        fullName: basicInfo?.fullName,
        age: basicInfo?.age,
        bloodGroup: basicInfo?.bloodGroup,
        gender: basicInfo?.gender,
        contact: basicInfo?.contact,
        address: basicInfo?.address
      },
      
      // Emergency Information
      emergencyInfo: {
        criticalAllergies: emergencyInfo?.criticalAllergies || [],
        currentMedications: emergencyInfo?.currentMedications || [],
        criticalConditions: emergencyInfo?.criticalConditions || [],
        primaryEmergencyContacts: emergencyInfo?.primaryEmergencyContacts || [],
        criticalNotes: emergencyInfo?.criticalNotes,
        primaryDoctor: emergencyInfo?.primaryDoctor
      },
      
      // Medical Information
      medicalInfo: {
        medicalConditions: medicalInfo?.medicalConditions || [],
        immunizations: medicalInfo?.immunizations || [],
        surgeries: emergencyInfo?.majorSurgeries || [],
        familyHistory: medicalInfo?.familyMedicalHistory || [],
        insurance: medicalInfo?.insurance,
        lifestyle: medicalInfo?.lifestyle
      },
      
      // QR Metadata
      qrMetadata: {
        qrCodeId: qrMetadata?.qrCodeId,
        issuedAt: qrMetadata?.issuedAt,
        recordUrl: qrMetadata?.recordUrl,
        displayFields: qrMetadata?.displayFieldsForQr || []
      },
      
      // System Info
      systemInfo: {
        patientId: patient._id,
        authId: patient.authId,
        createdAt: patient.createdAt,
        lastUpdated: patient.updatedAt
      }
    };

    res.json({
      success: true,
      data: displayData
    });

  } catch (err) {
    console.error("QR data fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch QR data", error: err.message });
  }
});

export default router;