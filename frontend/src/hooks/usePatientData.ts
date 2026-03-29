import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/apiClient";
import { resolveAvatarUrl } from "@/lib/avatar";

export interface PatientProfile {
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  health_id: string | null;
  avatar_url: string | null;
  age: string | null;
  height_cm: number | null;
  national_id: string | null;
  occupation: string | null;
  marital_status: string | null;
  address_street: string | null;
  address_city: string | null;
  address_county: string | null;
  address_country: string | null;
}

export interface PatientMedicalData {
  blood_type: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  current_medications: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  medical_conditions: Array<{
    condition: string;
    status: string | null;
    diagnosed_date: string | null;
    treatment: string | null;
  }>;
  immunizations: Array<{
    vaccine: string;
    date: string | null;
    status: string | null;
  }>;
  family_medical_history: Array<{
    relation: string | null;
    condition: string;
    age_diagnosed: number | null;
  }>;
  lifestyle: {
    smoking: string | null;
    alcohol: string | null;
    exercise: string | null;
    diet: string | null;
    sleep: string | null;
  };
}

export interface VitalSign {
  id: string;
  height_cm: number | null;
  weight_kg: number | null;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  recorded_at: string;
}

export interface MedicalVisit {
  id: string;
  diagnosis: string | null;
  doctor_name: string | null;
  department: string | null;
  visit_date: string;
  status: string;
  notes: string | null;
  follow_up_date: string | null;
  prescriptions: { name: string; instructions: string }[];
  created_at: string;
}

export interface QrDisplayData {
  basicInfo?: {
    fullName?: string;
    age?: number;
    bloodGroup?: string;
    contact?: {
      phone?: string;
      email?: string;
    };
  };
  emergencyInfo?: {
    criticalAllergies?: string[];
    currentMedications?: string[];
    criticalConditions?: string[];
    criticalNotes?: string;
    primaryEmergencyContacts?: Array<{
      name?: string;
      relation?: string;
      phone?: string;
      email?: string;
      isPrimary?: boolean;
    }>;
  };
  qrMetadata?: {
    qrCodeId?: string;
    issuedAt?: string;
  };
}

export interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  prescribed_by: string | null;
  status: string;
  notes: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
}

export interface BackendPatient {
  _id: string;
  authId: string;
  healthId?: string;
  basicInfo?: any;
  emergencyInfo?: any;
  medicalInfo?: any;
  createdAt?: string;
  updatedAt?: string;
}

function asValidDateString(input: unknown): string | null {
  if (!input || typeof input !== "string") return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : input;
}

function toStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => (typeof value === "string" ? value : String(value ?? "")))
    .map((value) => value.trim())
    .filter(Boolean);
}

async function fetchPatientByAuthId(authId: string): Promise<BackendPatient | null> {
  try {
    const response = await apiRequest<any>(`/api/patients/${authId}`);
    return response?.data || null;
  } catch {
    return null;
  }
}

function mapPatientProfile(patient: BackendPatient | null): PatientProfile | null {
  if (!patient) return null;
  const basicInfo = patient.basicInfo || {};
  const contact = basicInfo.contact || {};
  const dob = asValidDateString(basicInfo.dob);

  return {
    full_name: basicInfo.fullName || null,
    date_of_birth: dob ? new Date(dob).toISOString().slice(0, 10) : null,
    gender: basicInfo.gender || null,
    phone: contact.phone || null,
    health_id: patient.healthId || null,
    avatar_url: resolveAvatarUrl(
      basicInfo.profilePhoto || null,
      String(basicInfo.fullName || patient.healthId || patient.authId || "Patient"),
    ),
    age: basicInfo.age != null ? String(basicInfo.age) : null,
    height_cm: basicInfo.height ?? null,
    national_id: basicInfo.nationalId || null,
    occupation: basicInfo.occupation || null,
    marital_status: basicInfo.maritalStatus || null,
    address_street: basicInfo.address?.street || null,
    address_city: basicInfo.address?.city || null,
    address_county: basicInfo.address?.county || null,
    address_country: basicInfo.address?.country || null,
  };
}

function mapPatientMedicalData(patient: BackendPatient | null): PatientMedicalData | null {
  if (!patient) return null;
  const basicInfo = patient.basicInfo || {};
  const emergencyInfo = patient.emergencyInfo || {};
  const medicalInfo = patient.medicalInfo || {};
  const primaryContact = (emergencyInfo.primaryEmergencyContacts || [])[0] || null;
  const insurance = medicalInfo.insurance || {};
  const medicalConditions = Array.isArray(medicalInfo.medicalConditions) ? medicalInfo.medicalConditions : [];
  const immunizations = Array.isArray(medicalInfo.immunizations) ? medicalInfo.immunizations : [];
  const familyHistory = Array.isArray(medicalInfo.familyMedicalHistory) ? medicalInfo.familyMedicalHistory : [];
  const lifestyle = medicalInfo.lifestyle || {};

  return {
    blood_type: basicInfo.bloodGroup || null,
    allergies: toStringArray(emergencyInfo.criticalAllergies),
    chronic_conditions: toStringArray(emergencyInfo.criticalConditions),
    current_medications: toStringArray(emergencyInfo.currentMedications),
    emergency_contact_name: primaryContact?.name || null,
    emergency_contact_phone: primaryContact?.phone || null,
    emergency_contact_relation: primaryContact?.relation || null,
    insurance_provider: insurance.provider || null,
    insurance_policy_number: insurance.policyNumber || null,
    medical_conditions: medicalConditions
      .map((item: any) => ({
        condition: String(item?.condition || "").trim(),
        status: item?.status || null,
        diagnosed_date: asValidDateString(item?.diagnosedDate),
        treatment: item?.treatment || null,
      }))
      .filter((item: any) => Boolean(item.condition)),
    immunizations: immunizations
      .map((item: any) => ({
        vaccine: String(item?.vaccine || "").trim(),
        date: asValidDateString(item?.date),
        status: item?.status || null,
      }))
      .filter((item: any) => Boolean(item.vaccine)),
    family_medical_history: familyHistory
      .map((item: any) => ({
        relation: item?.relation || null,
        condition: String(item?.condition || "").trim(),
        age_diagnosed: item?.ageDiagnosed ?? null,
      }))
      .filter((item: any) => Boolean(item.condition)),
    lifestyle: {
      smoking: lifestyle.smoking || null,
      alcohol: lifestyle.alcohol || null,
      exercise: lifestyle.exercise || null,
      diet: lifestyle.diet || null,
      sleep: lifestyle.sleep || null,
    },
  };
}

export function usePatientProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient-profile", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const patient = await fetchPatientByAuthId(user.id);
      return mapPatientProfile(patient);
    },
    enabled: !!user,
  });
}

export function usePatientMedicalData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient-medical", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const patient = await fetchPatientByAuthId(user.id);
      return mapPatientMedicalData(patient);
    },
    enabled: !!user,
  });
}

export function useVitalSigns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vital-signs", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const patient = await fetchPatientByAuthId(user.id);
      if (!patient) return [] as VitalSign[];

      const vitals = patient.medicalInfo?.healthVitals || {};
      const bloodPressure = vitals.bloodPressure || {};
      const heartRate = vitals.heartRate || {};
      const weight = vitals.weight || {};

      const latestTimestamp =
        bloodPressure.lastUpdated || heartRate.lastUpdated || weight.lastUpdated || patient.updatedAt || new Date().toISOString();
      const recordedAt = asValidDateString(latestTimestamp) || new Date().toISOString();

      return [
        {
          id: patient._id,
          height_cm: patient.basicInfo?.height ?? null,
          weight_kg: weight.value ?? null,
          heart_rate: heartRate.value ?? null,
          blood_pressure_systolic: bloodPressure.systolic ?? null,
          blood_pressure_diastolic: bloodPressure.diastolic ?? null,
          temperature: null,
          oxygen_saturation: null,
          recorded_at: recordedAt,
        },
      ] as VitalSign[];
    },
    enabled: !!user,
  });
}

export function useMedicalVisits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["medical-visits", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const response = await apiRequest<any>(`/api/records/patient/${user.id}`);
      const records = response?.data || [];

      return records.map((record: any, index: number) => ({
        id: record._id || `visit-${index}`,
        diagnosis: record.diagnosis || null,
        doctor_name: record.medic?.name || null,
        department: record.medic?.specialization || "General",
        visit_date: asValidDateString(record.visitDate) || asValidDateString(record.createdAt) || new Date().toISOString(),
        status: record.status || "completed",
        notes: record.notes || null,
        follow_up_date: asValidDateString(record.followUpDate),
        prescriptions: Array.isArray(record.prescriptions)
          ? record.prescriptions.map((item: any) => {
              if (typeof item === "object" && item !== null) {
                const name = String(item.name || item.medicine || item.drug || "Medication");
                const instructions = String(item.instructions || item.dosage || "");
                return { name, instructions };
              }
              return { name: String(item), instructions: "" };
            })
          : [],
        created_at: asValidDateString(record.createdAt) || new Date().toISOString(),
      })) as MedicalVisit[];
    },
    enabled: !!user,
  });
}

export function useMedications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["medications", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const patient = await fetchPatientByAuthId(user.id);
      const medications = Array.isArray(patient?.medicalInfo?.medications) ? patient?.medicalInfo?.medications : [];

      return medications.map((med: any, index: number) => ({
        id: med?._id || `${patient?._id || "med"}-${index}`,
        name: med?.name || `Medication ${index + 1}`,
        dosage: med.dosage || null,
        frequency: med.frequency || null,
        start_date: asValidDateString(med.startDate),
        end_date: asValidDateString(med.endDate),
        prescribed_by: med.prescribedBy || null,
        status: med?.status || (med.endDate ? "completed" : "active"),
        notes: med?.notes || null,
      })) as Medication[];
    },
    enabled: !!user,
  });
}

export function useEmergencyContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["emergency-contacts", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const patient = await fetchPatientByAuthId(user.id);
      if (!patient?._id) return [] as EmergencyContact[];

      try {
        const response = await apiRequest<any>(`/api/emergency-contacts/${patient._id}`);
        const contacts = response?.contacts || [];
        const normalizedFromModel = contacts.map((contact: any, index: number) => ({
          id: contact._id || `contact-${index}`,
          name: contact.name || "Emergency Contact",
          relationship: contact.relationship || null,
          phone: contact.phone || null,
          email: contact.email || null,
          address: contact.address || null,
          is_primary: index === 0,
        })) as EmergencyContact[];

        if (normalizedFromModel.length > 0) {
          return normalizedFromModel;
        }

        const fallbackContacts = Array.isArray(patient?.emergencyInfo?.primaryEmergencyContacts)
          ? patient.emergencyInfo.primaryEmergencyContacts
          : [];

        return fallbackContacts.map((contact: any, index: number) => ({
          id: contact?._id || `fallback-contact-${index}`,
          name: contact?.name || "Emergency Contact",
          relationship: contact?.relation || contact?.relationship || null,
          phone: contact?.phone || null,
          email: contact?.email || null,
          address: contact?.address || null,
          is_primary: Boolean(contact?.isPrimary || index === 0),
        })) as EmergencyContact[];
      } catch {
        const fallbackContacts = Array.isArray(patient?.emergencyInfo?.primaryEmergencyContacts)
          ? patient.emergencyInfo.primaryEmergencyContacts
          : [];

        return fallbackContacts.map((contact: any, index: number) => ({
          id: contact?._id || `fallback-contact-${index}`,
          name: contact?.name || "Emergency Contact",
          relationship: contact?.relation || contact?.relationship || null,
          phone: contact?.phone || null,
          email: contact?.email || null,
          address: contact?.address || null,
          is_primary: Boolean(contact?.isPrimary || index === 0),
        })) as EmergencyContact[];
      }
    },
    enabled: !!user,
  });
}

export async function updatePatientProfile(authId: string, payload: any) {
  return apiRequest(`/api/patients/${authId}/basic-info`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadPatientPhoto(authId: string, file: File) {
  const formData = new FormData();
  formData.append("photo", file);

  return apiRequest(`/api/patients/${authId}/photo`, {
    method: "POST",
    body: formData,
  });
}

export async function getCurrentPatientRecord(authId: string) {
  return fetchPatientByAuthId(authId);
}

export function useQrDisplayData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["qr-display-data", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const response = await apiRequest<any>(`/api/qr/data/${user.id}`);
      return (response?.data || null) as QrDisplayData | null;
    },
    enabled: !!user,
  });
}
