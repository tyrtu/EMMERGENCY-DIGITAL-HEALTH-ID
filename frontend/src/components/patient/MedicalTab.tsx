import { Pill, Activity, Syringe, Users, HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePatientMedicalData } from "@/hooks/usePatientData";
import { format } from "date-fns";

function safeFormatDate(value: string | null | undefined, output: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, output);
}

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
  const detailedConditions = medical?.medical_conditions || [];
  const immunizations = medical?.immunizations || [];
  const familyHistory = medical?.family_medical_history || [];
  const lifestyle = medical?.lifestyle || {};

  return (
    <div className="space-y-6">
      {/* Blood Type & Key Info */}
      <div className="card-medical max-w-full w-full">
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
      <div className="card-medical max-w-full w-full">
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
      <div className="card-medical max-w-full w-full">
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

      {/* Detailed Conditions */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" /> Detailed Medical Conditions
        </h3>
        {detailedConditions.length > 0 ? (
          <div className="space-y-3">
            {detailedConditions.map((item, idx) => (
              <div key={`${item.condition}-${idx}`} className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">{item.condition}</div>
                  <Badge variant="info">{item.status || "Unknown"}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Diagnosed: {safeFormatDate(item.diagnosed_date, "MMM d, yyyy")}
                </div>
                {item.treatment && (
                  <div className="mt-1 text-xs text-foreground">Treatment: {item.treatment}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No detailed condition records</p>
        )}
      </div>

      {/* Immunizations */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Syringe className="h-4 w-4 text-safe" /> Immunizations
        </h3>
        {immunizations.length > 0 ? (
          <div className="space-y-2">
            {immunizations.map((item, idx) => (
              <div key={`${item.vaccine}-${idx}`} className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.vaccine}</div>
                  <div className="text-xs text-muted-foreground">
                    {safeFormatDate(item.date, "MMM d, yyyy")}
                  </div>
                </div>
                <Badge variant="safe">{item.status || "Recorded"}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No immunization records</p>
        )}
      </div>

      {/* Family Medical History */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-caution" /> Family Medical History
        </h3>
        {familyHistory.length > 0 ? (
          <div className="space-y-2">
            {familyHistory.map((item, idx) => (
              <div key={`${item.relation || "family"}-${item.condition}-${idx}`} className="rounded-lg bg-muted/40 p-3">
                <div className="text-sm font-medium text-foreground">{item.condition}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.relation || "Relative"}
                  {item.age_diagnosed != null ? ` • Diagnosed at ${item.age_diagnosed}` : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No family history records</p>
        )}
      </div>

      {/* Lifestyle */}
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4">Lifestyle & Habits</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Smoking</div>
            <div className="mt-1 text-sm font-medium text-foreground">{lifestyle.smoking || "Not specified"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Alcohol</div>
            <div className="mt-1 text-sm font-medium text-foreground">{lifestyle.alcohol || "Not specified"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Exercise</div>
            <div className="mt-1 text-sm font-medium text-foreground">{lifestyle.exercise || "Not specified"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Diet</div>
            <div className="mt-1 text-sm font-medium text-foreground">{lifestyle.diet || "Not specified"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Sleep</div>
            <div className="mt-1 text-sm font-medium text-foreground">{lifestyle.sleep || "Not specified"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
