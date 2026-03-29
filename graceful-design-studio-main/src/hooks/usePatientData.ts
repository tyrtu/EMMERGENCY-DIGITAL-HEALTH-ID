import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PatientProfile {
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  health_id: string | null;
  avatar_url: string | null;
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
  doctor_name: string | null;
  department: string | null;
  visit_date: string;
  status: string;
  notes: string | null;
  follow_up_date: string | null;
  prescriptions: { name: string; instructions: string }[];
  created_at: string;
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

export function usePatientProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient-profile", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, date_of_birth, gender, phone, health_id, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as PatientProfile | null;
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
      const { data, error } = await supabase
        .from("patient_medical_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as PatientMedicalData | null;
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
      const { data, error } = await supabase
        .from("vital_signs")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as VitalSign[];
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
      const { data, error } = await supabase
        .from("medical_visits")
        .select("*")
        .eq("user_id", user.id)
        .order("visit_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MedicalVisit[];
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
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Medication[];
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
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmergencyContact[];
    },
    enabled: !!user,
  });
}
