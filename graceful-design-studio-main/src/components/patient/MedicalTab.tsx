import { Pill, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePatientMedicalData } from "@/hooks/usePatientData";

export default function MedicalTab() {
  const { data: medical, isLoading } = usePatientMedicalData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="card-medical animate-pulse h-32" />
        ))}
      </div>
    );
  }

  const medications = medical?.current_medications || [];
  const conditions = medical?.chronic_conditions || [];

  return (
    <div className="space-y-6">
      {/* Blood Type & Key Info */}
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4">Key Medical Info</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Blood Type</div>
            <div className="mt-1 text-lg font-bold text-foreground font-mono">{medical?.blood_type || "—"}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Insurance</div>
            <div className="mt-1 text-sm font-medium text-foreground">{medical?.insurance_provider || "Not set"}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Policy #</div>
            <div className="mt-1 text-sm font-medium text-foreground font-mono">{medical?.insurance_policy_number || "—"}</div>
          </div>
        </div>
      </div>

      {/* Medications */}
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" /> Current Medications
        </h3>
        {medications.length > 0 ? (
          <div className="space-y-2">
            {medications.map((med) => (
              <div key={med} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium text-foreground">{med}</span>
                <Badge variant="info">Active</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No medications recorded</p>
        )}
      </div>

      {/* Conditions */}
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-caution" /> Chronic Conditions
        </h3>
        {conditions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <Badge key={c} variant="caution">{c}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No conditions recorded</p>
        )}
      </div>
    </div>
  );
}
