import { Calendar, Stethoscope, FileText, Clock, Pill, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMedicalVisits } from "@/hooks/usePatientData";
import { format } from "date-fns";

const statusConfig: Record<string, { variant: "default" | "emergency" | "caution" | "info" | "safe"; label: string }> = {
  completed: { variant: "safe", label: "Completed" },
  pending: { variant: "caution", label: "Pending" },
  cancelled: { variant: "emergency", label: "Cancelled" },
  scheduled: { variant: "info", label: "Scheduled" },
};

export default function MedicalVisitsTab() {
  const { data: visits, isLoading } = useMedicalVisits();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card-medical animate-pulse h-40" />
        ))}
      </div>
    );
  }

  const totalVisits = visits?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-medical">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Medical Visits</h3>
            <p className="text-xs text-muted-foreground mt-1">Your complete medical visit history and records</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary">{totalVisits}</div>
            <div className="text-xs text-muted-foreground">Total Visits</div>
          </div>
        </div>
      </div>

      {/* Visit Cards */}
      {visits && visits.length > 0 ? (
        visits.map((visit) => {
          const status = statusConfig[visit.status] ?? statusConfig.pending;
          const prescriptions = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];

          return (
            <div key={visit.id} className="card-medical space-y-4">
              {/* Visit Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{visit.department || "General Visit"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(visit.visit_date), "MMMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              {/* Visit Details Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Doctor</div>
                  <div className="text-sm font-medium text-foreground">{visit.doctor_name || "—"}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Department</div>
                  <div className="text-sm font-medium text-foreground">{visit.department || "—"}</div>
                </div>
              </div>

              {/* Follow-up */}
              {visit.follow_up_date && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-caution" />
                  <span>Follow-up: {format(new Date(visit.follow_up_date), "MMM d, yyyy")}</span>
                </div>
              )}

              {/* Notes */}
              {visit.notes && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Medical Notes
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{visit.notes}</p>
                </div>
              )}

              {/* Prescriptions */}
              {prescriptions.length > 0 && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Pill className="h-3 w-3" /> Prescriptions ({prescriptions.length})
                  </div>
                  <div className="space-y-1.5">
                    {prescriptions.map((rx, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="font-medium">{rx.name}</span>
                        {rx.instructions && (
                          <span className="text-muted-foreground">({rx.instructions})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="card-medical text-center py-10">
          <Stethoscope className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No medical visits recorded yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Visit records will appear here after a medic documents them.</p>
        </div>
      )}
    </div>
  );
}
