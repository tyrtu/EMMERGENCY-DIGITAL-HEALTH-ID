import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ScanRecord {
  id: string;
  medic_user_id: string;
  patient_user_id: string;
  patient_health_id: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  patient_name?: string;
  blood_type?: string;
  chronic_conditions?: string[];
  allergies?: string[];
}

export function useRecentScans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["medic-scans", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data: scans, error } = await supabase
        .from("scan_records")
        .select("*")
        .eq("medic_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!scans || scans.length === 0) return [];

      // Get unique patient IDs
      const patientIds = [...new Set(scans.map((s) => s.patient_user_id))];

      // Fetch profiles and medical data for these patients
      const [profilesRes, medicalRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
        supabase.from("patient_medical_data").select("user_id, blood_type, chronic_conditions, allergies").in("user_id", patientIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
      const medicalMap = new Map((medicalRes.data || []).map((m) => [m.user_id, m]));

      return scans.map((scan): ScanRecord => {
        const profile = profileMap.get(scan.patient_user_id);
        const medical = medicalMap.get(scan.patient_user_id);
        return {
          ...scan,
          patient_name: profile?.full_name || "Unknown",
          blood_type: medical?.blood_type || undefined,
          chronic_conditions: medical?.chronic_conditions || undefined,
          allergies: medical?.allergies || undefined,
        };
      });
    },
    enabled: !!user,
  });
}

export function useScanNotes(scanId: string | null) {
  return useQuery({
    queryKey: ["scan-notes", scanId],
    queryFn: async () => {
      if (!scanId) return [];
      const { data, error } = await supabase
        .from("scan_notes")
        .select("*")
        .eq("scan_id", scanId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!scanId,
  });
}

export async function createScanRecord(medicUserId: string, patientUserId: string, healthId: string, notes?: string) {
  const { data, error } = await supabase
    .from("scan_records")
    .insert({
      medic_user_id: medicUserId,
      patient_user_id: patientUserId,
      patient_health_id: healthId,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addScanNote(scanId: string, medicUserId: string, content: string) {
  const { data, error } = await supabase
    .from("scan_notes")
    .insert({ scan_id: scanId, medic_user_id: medicUserId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}
