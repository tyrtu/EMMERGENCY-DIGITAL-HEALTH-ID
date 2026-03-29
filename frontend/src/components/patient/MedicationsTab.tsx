import { Pill, Calendar, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMedications, usePatientProfile, usePatientMedicalData } from "@/hooks/usePatientData";
import { format } from "date-fns";

function safeFormatDate(value: string | null | undefined, output: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, output);
}

export default function MedicationsTab() {
  const { data: meds, isLoading } = useMedications();
  const { data: profile } = usePatientProfile();
  const { data: medical } = usePatientMedicalData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card-medical animate-pulse h-32" />
        ))}
      </div>
    );
  }

  const activeMeds = meds?.filter((m) => m.status === "active") ?? [];
  const allMeds = meds ?? [];
  const allergies = medical?.allergies ?? [];
  const birthDate = profile?.date_of_birth ? new Date(profile.date_of_birth) : null;
  const hasValidBirthDate = birthDate && !Number.isNaN(birthDate.getTime());
  const age = hasValidBirthDate ? new Date().getFullYear() - birthDate.getFullYear() : null;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="card-medical">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Medications</h3>
            <p className="text-xs text-muted-foreground mt-1">Current and past medication history</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-safe">{activeMeds.length}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{allMeds.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Context Banner */}
      {(profile || allergies.length > 0) && (
        <div className="card-medical bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{profile?.full_name || "Patient"}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {medical?.blood_type || "—"} • {age !== null ? `${age} years` : "—"} • Health ID: {profile?.health_id || "—"}
              </div>
            </div>
          </div>
          {allergies.length > 0 && (
            <div className="mt-3 text-xs text-emergency font-medium">
              Allergies: {allergies.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Medication Cards */}
      {allMeds.length > 0 ? (
        allMeds.map((med) => (
          <div key={med.id} className="card-medical space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${med.status === "active" ? "bg-safe/10" : "bg-muted/60"}`}>
                  <Pill className={`h-5 w-5 ${med.status === "active" ? "text-safe" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{med.name}</div>
                  <Badge variant={med.status === "active" ? "safe" : "default"} className="mt-1">
                    {med.status === "active" ? "Active" : med.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dosage</div>
                <div className="text-sm font-medium text-foreground">{med.dosage || "—"}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Frequency</div>
                <div className="text-sm font-medium text-foreground">{med.frequency || "—"}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Start Date
                </div>
                <div className="text-sm font-medium text-foreground">
                  {safeFormatDate(med.start_date, "MMM d, yyyy")}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> End Date
                </div>
                <div className="text-sm font-medium text-foreground">
                  {med.end_date ? safeFormatDate(med.end_date, "MMM d, yyyy") : "Ongoing"}
                </div>
              </div>
            </div>

            {med.prescribed_by && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <User className="h-3.5 w-3.5" />
                <span>Prescribed by <span className="font-medium text-foreground">{med.prescribed_by}</span></span>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="card-medical text-center py-10">
          <Pill className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No medications recorded yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Medications will appear here after a medic prescribes them.</p>
        </div>
      )}
    </div>
  );
}
