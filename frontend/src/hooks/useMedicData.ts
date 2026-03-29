import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/apiClient";

export interface ScanRecord {
  id: string;
  medic_user_id: string;
  patient_user_id: string;
  patient_health_id: string | null;
  notes: string | null;
  created_at: string;
  scan_status?: "critical" | "caution" | "normal" | "resolved" | string;
  scan_type?: string;
  response_time?: number | null;
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
      const response = await apiRequest<any>(`/api/analytics/scans?medicId=${encodeURIComponent(user.id)}&size=50&page=0`);
      const scans = response?.data || [];

      // Resolve Health ID (EMR ID) for each patient identifier when analytics only stores authId.
      const uniquePatientIds = Array.from(
        new Set(
          scans
            .map((scan: any) => String(scan?.patientId || "").trim())
            .filter(Boolean),
        ),
      );

      const healthIdByPatientId: Record<string, string> = {};
      await Promise.all(
        uniquePatientIds.map(async (patientId) => {
          if (/^EMH-/i.test(patientId)) {
            healthIdByPatientId[patientId] = patientId.toUpperCase();
            return;
          }

          try {
            const patientResponse = await apiRequest<any>(`/api/patients/${encodeURIComponent(patientId)}`);
            const resolvedHealthId = String(patientResponse?.data?.healthId || "").trim();
            if (resolvedHealthId) {
              healthIdByPatientId[patientId] = resolvedHealthId;
            }
          } catch {
            // Leave unresolved; UI will display fallback text.
          }
        }),
      );

      return scans.map((scan: any): ScanRecord => ({
        id: scan._id,
        medic_user_id: scan.medicId,
        patient_user_id: scan.patientId,
        patient_health_id:
          healthIdByPatientId[String(scan.patientId || "").trim()] ||
          (/^EMH-/i.test(String(scan.patientId || "")) ? String(scan.patientId).toUpperCase() : null),
        notes: scan.notes || null,
        created_at: scan.scannedAt || scan.createdAt,
        scan_status: scan.scanStatus || "normal",
        scan_type: scan.scanType || "Emergency",
        response_time: typeof scan.responseTime === "number" ? scan.responseTime : null,
        patient_name: scan.patientInfo?.name || "Unknown",
        blood_type: scan.patientInfo?.bloodGroup || undefined,
        chronic_conditions: scan.medicalConditions || scan.conditions || undefined,
        allergies: scan.allergies || undefined,
      }));
    },
    enabled: !!user,
  });
}

export function useScanNotes(scanId: string | null) {
  return useQuery({
    queryKey: ["scan-notes", scanId],
    queryFn: async () => {
      if (!scanId) return [];
      const response = await apiRequest<any>(`/api/analytics/scans/${scanId}`);
      const scan = response?.data;
      if (!scan) return [];

      const actions = Array.isArray(scan.actionsTaken)
        ? scan.actionsTaken.map((action: any, index: number) => ({
            id: `${scanId}-action-${index}`,
            content: action.notes || action.action || "",
            created_at: action.timestamp || scan.createdAt,
          }))
        : [];

      if (scan.notes) {
        actions.push({
          id: `${scanId}-summary`,
          content: scan.notes,
          created_at: scan.updatedAt || scan.createdAt,
        });
      }

      return actions;
    },
    enabled: !!scanId,
  });
}

export async function createScanRecord(
  medicUserId: string,
  patientUserId: string,
  healthId: string,
  notes?: string,
  patientName?: string,
  bloodType?: string,
  allergies?: string[],
  conditions?: string[],
  medications?: string[]
) {
  const scanId = `scan-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const response = await apiRequest<any>("/api/analytics/scans", {
    method: "POST",
    body: JSON.stringify({
      scanId,
      medicId: medicUserId,
      patientId: patientUserId || healthId,
      patientInfo: {
        name: patientName || "Unknown",
        bloodGroup: bloodType || "Unknown",
      },
      scanType: "Emergency",
      scanStatus: (allergies?.length || conditions?.length) ? "caution" : "normal",
      allergies: allergies || [],
      medicalConditions: conditions || [],
      medications: medications || [],
      criticalConditionsFound: conditions?.length || 0,
      notes: notes || null,
    }),
  });

  return { id: response?.data?._id, ...response?.data };
}

export async function addScanNote(scanId: string, medicUserId: string, content: string) {
  const timestamp = new Date().toISOString();
  const response = await apiRequest<any>(`/api/analytics/scans/${scanId}`, {
    method: "PUT",
    body: JSON.stringify({
      $push: {
        actionsTaken: {
          action: "note",
          timestamp,
          notes: content,
          medicId: medicUserId,
        },
      },
      notes: content,
    }),
  });

  return response?.data;
}
