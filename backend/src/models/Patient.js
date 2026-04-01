import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    // ========================
    // AUTH & ACCOUNT INFO
    // ========================
    authId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    healthId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpires: Date,

    // ========================
    // BASIC / PERSONAL INFO
    // ========================
    basicInfo: {
      fullName: { type: String, required: true, trim: true },
      dob: { type: Date },
      age: { type: String, trim: true }, // ✅ ADDED - Missing from your schema
      gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
      height: { type: Number }, // Height in cm for BMI calculation
      bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
        default: "Unknown",
      },
      nationalId: { type: String, trim: true },
      occupation: { type: String, trim: true },
      maritalStatus: { type: String, enum: ["Single", "Married", "Divorced", "Widowed"] },
      profilePhoto: String,
      contact: {
        email: String,
        phone: String,
      },
      address: {
        street: String,
        city: String,
        county: String,
        country: String,
      },
    },

    // ========================
    // EMERGENCY INFO
    // ========================
    emergencyInfo: {
      primaryEmergencyContacts: [
        {
          name: String,
          relation: String,
          phone: String,
          email: String,
          address: String,
          isPrimary: { type: Boolean, default: false },
        },
      ],
      criticalAllergies: [String],
      criticalConditions: [String],
      currentMedications: [String],
      majorSurgeries: [String],
      criticalNotes: String,
      preferredHospitalInEmergency: {
        name: String,
        address: String,
        phone: String,
      },
      primaryDoctor: {
        name: String,
        hospital: String,
        contact: String,
        email: String,
      },
    },

    // ========================
    // MEDICAL INFO
    // ========================
    medicalInfo: {
      immunizations: [
        {
          vaccine: String,
          date: Date,
          status: { type: String, enum: ["Completed", "Pending"], default: "Completed" },
        },
      ],
      medicalConditions: [
        {
          condition: String,
          diagnosedDate: Date,
          status: { type: String, enum: ["Active", "Controlled", "Resolved"] },
          treatment: String,
        },
      ],
      medications: [
        {
          name: String,
          dosage: String,
          frequency: String,
          startDate: Date,
          endDate: Date,
          prescribedBy: String,
        },
      ],
      surgeries: [
        {
          type: String,
          date: Date,
          hospital: String,
          surgeon: String,
          notes: String,
        },
      ],
      familyMedicalHistory: [
        {
          relation: String,
          condition: String,
          ageDiagnosed: Number,
        },
      ],
      insurance: {
        provider: String,
        policyNumber: String,
        coverage: String,
      },
      lifestyle: {
        smoking: { type: String, default: "Never" },
        alcohol: { type: String, default: "Never" },
        exercise: { type: String, default: "Sedentary" },
        diet: { type: String, default: "Balanced" },
        sleep: { type: String, default: "7 hours/night" },
      },
      // Health Vitals - Patient self-measurable metrics
      healthVitals: {
        bloodPressure: {
          systolic: { type: Number },
          diastolic: { type: Number },
          lastUpdated: { type: Date },
        },
        heartRate: {
          value: { type: Number },
          unit: { type: String, default: "bpm" },
          lastUpdated: { type: Date },
        },
        weight: {
          value: { type: Number },
          unit: { type: String, default: "kg" },
          lastUpdated: { type: Date },
        },
        bmi: {
          value: { type: Number },
          lastUpdated: { type: Date },
        },
      },
    },

    // ========================
    // QR METADATA
    // ========================
    qrMetadata: {
      qrCodeId: { type: String, unique: true, sparse: true },
      issuedAt: { type: Date, default: Date.now },
      recordUrl: String,
      displayFieldsForQr: [String],
    },

    // ========================
    // SYSTEM STATUS & CONSENT
    // ========================
    profileStatus: {
      type: String,
      enum: [
        "pending_setup",
        "basic_info_complete",
        "emergency_info_complete",
        "medical_info_complete",
        "active",
      ],
      default: "pending_setup",
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "archived"],
      default: "active",
    },
    consent: {
      dataSharing: { type: Boolean, default: false },
      researchParticipation: { type: Boolean, default: false },
      emergencyContactAllowed: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },

    // ========================
    // AUDIT FIELDS
    // ========================
    createdBy: { type: String, default: "system" },
    lastUpdatedBy: {
      userType: { type: String, enum: ["patient", "medic", "admin"] },
      authId: String,
      timestamp: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// ========================
// INDEXES & VIRTUALS
// ========================
patientSchema.index({ authId: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ "basicInfo.fullName": 1 });
patientSchema.index({ "emergencyInfo.primaryDoctor.name": 1 });
patientSchema.index({ "medicalInfo.insurance.provider": 1 });

// Virtual for age calculation (if using dob)
patientSchema.virtual("age").get(function () {
  if (!this.basicInfo?.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.basicInfo.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age.toString(); // Return as string to match your document format
});

// Virtual to ensure age field is included in JSON output
patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

// Add indexes for frequently queried fields
patientSchema.index({ authId: 1 }, { unique: true });
patientSchema.index({ email: 1 });
patientSchema.index({ 'basicInfo.bloodGroup': 1 });
patientSchema.index({ 'emergencyInfo.criticalAllergies': 1 });
patientSchema.index({ 'emergencyInfo.criticalConditions': 1 });
patientSchema.index({ 'medicalInfo.medicalConditions.condition': 1 });
patientSchema.index({ createdAt: -1 });
patientSchema.index({ updatedAt: -1 });

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;