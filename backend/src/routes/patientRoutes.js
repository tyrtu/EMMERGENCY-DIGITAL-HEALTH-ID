import express from "express";
import Patient from "../models/Patient.js";
import { logAction } from "../middleware/auditLogger.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateHealthVitals } from "../middleware/validation.js";
// import { authLimiter } from "../middleware/rateLimiter.js";
import { generateHealthId } from "../utils/healthIdGenerator.js";
import upload from "../middleware/upload.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Note: identifyUser is already applied globally in app.js, no need to apply again

// helper for logging
function logError(route, error, req) {
  console.error(`[❌ ERROR] ${route} | User: ${req.userType || "unknown"} | ${error.message}`);
  console.error(`Stack: ${error.stack}`);
}

// ✅ Only medics/admins can fetch all patients
router.get("/", requireRole(["medic", "admin"]), async (req, res) => {
  try {
    const patients = await Patient.find();
    // Success logged only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ SUCCESS] ${patients.length} patients fetched by ${req.userType}`);
    }
    res.json({ success: true, count: patients.length, data: patients });
  } catch (err) {
    logError("GET /api/patients", err, req);
    res.status(500).json({ success: false, message: "Failed to fetch patients", error: err.message });
  }
});

// ✅ Only medics/admins can register a new patient
router.post("/", requireRole(["patient","medic", "admin"]), async (req, res) => {
  try {
    const { authId } = req.body;
    if (!authId) return res.status(400).json({ success: false, message: "authId is required" });

    const existing = await Patient.findOne({ authId });
    if (existing) return res.status(400).json({ success: false, message: "Patient already exists" });

    // Generate unique Health ID if not provided
    let healthId = req.body.healthId;
    if (!healthId) {
      healthId = await generateHealthId();
    }

    // Clean up qrMetadata to avoid null qrCodeId issues
    const patientData = { ...req.body, authId, healthId };
    
    // If qrMetadata exists but qrCodeId is null/undefined, remove qrMetadata entirely
    // This prevents the unique index error for null values
    if (patientData.qrMetadata && !patientData.qrMetadata.qrCodeId) {
      delete patientData.qrMetadata;
    }
    
    // If qrMetadata is an empty object, remove it
    if (patientData.qrMetadata && Object.keys(patientData.qrMetadata).length === 0) {
      delete patientData.qrMetadata;
    }

    const patient = new Patient(patientData);
    await patient.save();
    await logAction(req, "CREATE_PATIENT", patient._id);
    // Success logged only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ CREATED] Patient ${authId} created by ${req.userType}`);
    }

    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    logError("POST /api/patients", err, req);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ Patients can view their own record, medics/admins can view anyone
// Supports both authId and healthId (EMH-XXXXXX) for search
router.get("/:identifier", requireRole(["patient", "medic", "admin"]), async (req, res) => {
  try {
    const { identifier } = req.params;
    let patient;
    
    // Check if identifier is a healthId (EMH-XXXXXX format) or authId
    if (identifier.startsWith('EMH-')) {
      // Search by healthId
      patient = await Patient.findOne({ healthId: identifier.toUpperCase() });
    } else {
      // Search by authId (for backward compatibility)
      patient = await Patient.findOne({ authId: identifier });
    }
    
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    // For patients, only allow viewing their own record
    if (req.userType === "patient" && req.profile?.authId !== patient.authId) {
      return res.status(403).json({ success: false, message: "You can only view your own record" });
    }

    // Generate Health ID for existing patients who don't have one
    if (!patient.healthId) {
      const healthId = await generateHealthId();
      patient.healthId = healthId;
      await patient.save();
    }

    await logAction(req, "VIEW_PATIENT", patient._id);
    // Success logged only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ VIEWED] Patient ${patient.healthId || patient.authId} by ${req.userType}`);
    }
    res.json({ success: true, data: patient });
  } catch (err) {
    logError("GET /api/patients/:authId", err, req);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Upload patient photo
router.post("/:authId/photo", requireRole(["patient", "medic", "admin"]), upload.single('photo'), async (req, res) => {
  try {
    const { authId } = req.params;

    // Authorization check
    if (req.userType === "patient" && req.profile?.authId !== authId) {
      // Delete uploaded file if unauthorized
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ success: false, message: "You can only update your own photo" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No photo file provided" });
    }

    const patient = await Patient.findOne({ authId });
    if (!patient) {
      // Delete uploaded file if patient not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Delete old photo if exists
    if (patient.basicInfo?.profilePhoto) {
      const oldPhotoPath = patient.basicInfo.profilePhoto.replace('/uploads/', '');
      const fullOldPath = path.join(__dirname, '../../', oldPhotoPath);
      if (fs.existsSync(fullOldPath)) {
        try {
          fs.unlinkSync(fullOldPath);
        } catch (err) {
          // Ignore errors deleting old photo
        }
      }
    }

    // Update patient with new photo path using findOneAndUpdate to avoid validation issues
    const photoPath = `/uploads/patients/${req.file.filename}`;
    const updated = await Patient.findOneAndUpdate(
      { authId },
      { $set: { "basicInfo.profilePhoto": photoPath } },
      { new: true, runValidators: false } // Use runValidators: false to avoid email validation issue
    );

    await logAction(req, "UPDATE_PATIENT_PHOTO", updated._id);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ UPDATED] Photo for patient ${authId} by ${req.userType}`);
    }
    
    res.json({ success: true, data: updated, photoUrl: photoPath });
  } catch (err) {
    // Delete uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        // Ignore errors
      }
    }
    logError("POST /api/patients/:authId/photo", err, req);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ Update basic info only (patient can edit their own basic info)
router.put("/:authId/basic-info", requireRole(["patient", "medic", "admin"]), async (req, res) => {
  try {
    const { authId } = req.params;
    const { fullName, dob, age, gender, height, bloodGroup, nationalId, occupation, maritalStatus, contact, address } = req.body;

    // Authorization check
    if (req.userType === "patient" && req.profile?.authId !== authId) {
      return res.status(403).json({ success: false, message: "You can only update your own information" });
    }

    const patient = await Patient.findOne({ authId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // Only allow updating basic info fields (not medical info)
    const updateData = {};
    
    if (fullName !== undefined) updateData["basicInfo.fullName"] = fullName;
    if (dob !== undefined) updateData["basicInfo.dob"] = dob;
    if (age !== undefined) updateData["basicInfo.age"] = age;
    if (gender !== undefined) updateData["basicInfo.gender"] = gender;
    if (height !== undefined) updateData["basicInfo.height"] = height;
    if (bloodGroup !== undefined) updateData["basicInfo.bloodGroup"] = bloodGroup;
    if (nationalId !== undefined) updateData["basicInfo.nationalId"] = nationalId;
    if (occupation !== undefined) updateData["basicInfo.occupation"] = occupation;
    if (maritalStatus !== undefined) updateData["basicInfo.maritalStatus"] = maritalStatus;
    
    if (contact) {
      if (contact.email !== undefined) updateData["basicInfo.contact.email"] = contact.email;
      if (contact.phone !== undefined) updateData["basicInfo.contact.phone"] = contact.phone;
    }
    
    if (address) {
      if (address.street !== undefined) updateData["basicInfo.address.street"] = address.street;
      if (address.city !== undefined) updateData["basicInfo.address.city"] = address.city;
      if (address.county !== undefined) updateData["basicInfo.address.county"] = address.county;
      if (address.country !== undefined) updateData["basicInfo.address.country"] = address.country;
    }

    const updated = await Patient.findOneAndUpdate(
      { authId },
      { $set: updateData },
      { new: true }
    );

    await logAction(req, "UPDATE_PATIENT_BASIC_INFO", updated._id);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ UPDATED] Basic info for patient ${authId} by ${req.userType}`);
    }
    
    res.json({ success: true, data: updated });
  } catch (err) {
    logError("PUT /api/patients/:authId/basic-info", err, req);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ Patients can update their own record, medics/admins can update anyone
router.put("/:authId", requireRole(["patient", "medic", "admin"]), async (req, res) => {
  try {
    const { authId } = req.params;
    const updateData = req.body;

    // Authorization check
    if (req.userType === "patient" && req.profile?.authId !== authId) {
      return res.status(403).json({ success: false, message: "You can only update your own record" });
    }

    const patient = await Patient.findOne({ authId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // If patient is updating, restrict to basic info and emergency contacts only
    if (req.userType === "patient") {
      // Remove medical info fields from updateData
      delete updateData.medicalInfo;
      delete updateData.emergencyInfo?.criticalAllergies;
      delete updateData.emergencyInfo?.criticalConditions;
      delete updateData.emergencyInfo?.currentMedications;
      delete updateData.emergencyInfo?.majorSurgeries;
      // Allow emergencyInfo.primaryEmergencyContacts to be updated
      // Allow basicInfo updates (handled separately in basic-info route, but allow here too for flexibility)
    }

    const updated = await Patient.findOneAndUpdate({ authId }, updateData, { new: true });
    await logAction(req, "UPDATE_PATIENT", updated._id);
    // Success logged only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ UPDATED] Patient ${authId} by ${req.userType}`);
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    logError("PUT /api/patients/:authId", err, req);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ Update health vitals (patients can update their own, medics/admins can update anyone)
router.put("/:authId/vitals", /* authLimiter, */ requireRole(["patient", "medic", "admin"]), validateHealthVitals, async (req, res) => {
  try {
    const { authId } = req.params;
    const { bloodPressure, heartRate, weight, height } = req.body;

    const patient = await Patient.findOne({ authId });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    if (req.userType === "patient" && req.profile?.authId !== authId) {
      return res.status(403).json({ success: false, message: "You can only update your own vitals" });
    }

    const updateData = {};
    const now = new Date();

    // Update height if provided (needed for BMI calculation)
    if (height !== undefined && height !== null) {
      updateData["basicInfo.height"] = height;
    }

    // Update blood pressure
    if (bloodPressure && (bloodPressure.systolic || bloodPressure.diastolic)) {
      updateData["medicalInfo.healthVitals.bloodPressure"] = {
        systolic: bloodPressure.systolic || patient.medicalInfo?.healthVitals?.bloodPressure?.systolic,
        diastolic: bloodPressure.diastolic || patient.medicalInfo?.healthVitals?.bloodPressure?.diastolic,
        lastUpdated: now,
      };
    }

    // Update heart rate
    if (heartRate !== undefined && heartRate !== null) {
      updateData["medicalInfo.healthVitals.heartRate"] = {
        value: heartRate,
        unit: "bpm",
        lastUpdated: now,
      };
    }

    // Update weight and calculate BMI automatically
    let calculatedWeight = weight;
    if (weight !== undefined && weight !== null) {
      calculatedWeight = parseFloat(weight);
      updateData["medicalInfo.healthVitals.weight"] = {
        value: calculatedWeight,
        unit: "kg",
        lastUpdated: now,
      };
    }

    // Calculate BMI automatically if weight and height are available
    // BMI = weight (kg) / height (m)^2
    const patientHeight = height !== undefined && height !== null 
      ? parseFloat(height) 
      : patient.basicInfo?.height;
    
    // Validate height range (30-300 cm) and weight range (1-500 kg)
    if (calculatedWeight && patientHeight && patientHeight > 0) {
      if (patientHeight < 30 || patientHeight > 300) {
        return res.status(400).json({ 
          success: false, 
          message: 'Height must be between 30 and 300 cm' 
        });
      }
      if (calculatedWeight < 1 || calculatedWeight > 500) {
        return res.status(400).json({ 
          success: false, 
          message: 'Weight must be between 1 and 500 kg' 
        });
      }
      
      // Convert height from cm to meters (assuming height is in cm if > 3, otherwise already in meters)
      const heightInMeters = patientHeight > 3 ? patientHeight / 100 : patientHeight;
      const bmi = calculatedWeight / (heightInMeters * heightInMeters);
      
      // Validate BMI range (10-70)
      if (bmi < 10 || bmi > 70) {
        return res.status(400).json({ 
          success: false, 
          message: 'Calculated BMI is outside valid range (10-70). Please check weight and height values.' 
        });
      }
      
      updateData["medicalInfo.healthVitals.bmi"] = {
        value: parseFloat(bmi.toFixed(1)),
        lastUpdated: now,
      };
    } else if (req.body.bmi !== undefined && req.body.bmi !== null) {
      const providedBMI = parseFloat(req.body.bmi);
      if (providedBMI < 10 || providedBMI > 70) {
        return res.status(400).json({ 
          success: false, 
          message: 'BMI must be between 10 and 70' 
        });
      }
      // If BMI is provided directly and we can't calculate, use the provided value
      updateData["medicalInfo.healthVitals.bmi"] = {
        value: providedBMI,
        lastUpdated: now,
      };
    }

    // Update lastUpdated timestamp
    updateData["lastUpdatedBy"] = {
      userType: req.userType,
      authId: req.profile?.authId || req.user?.id,
      timestamp: now,
    };

    const updated = await Patient.findOneAndUpdate(
      { authId },
      { $set: updateData },
      { new: true }
    );

    await logAction(req, "UPDATE_HEALTH_VITALS", updated._id);
    // Success logged only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[✅ UPDATED] Health vitals for patient ${authId} by ${req.userType}`);
    }
    
    res.json({ success: true, data: updated });
  } catch (err) {
    logError("PUT /api/patients/:authId/vitals", err, req);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ Only admins can delete a patient
router.delete("/:authId", requireRole("admin"), async (req, res) => {
  try {
    const deleted = await Patient.findOneAndDelete({ authId: req.params.authId });
    if (!deleted) return res.status(404).json({ success: false, message: "Patient not found" });

    await logAction(req, "DELETE_PATIENT", deleted._id);
    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (err) {
    logError("DELETE /api/patients/:authId", err, req);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
