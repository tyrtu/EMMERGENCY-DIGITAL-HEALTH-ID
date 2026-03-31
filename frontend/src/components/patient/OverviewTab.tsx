import {
  Heart, Activity, AlertTriangle, Phone, Pill,
  Droplets
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePatientProfile, usePatientMedicalData } from "@/hooks/usePatientData";
import VitalsCard from "@/components/patient/VitalsCard";
import VitalsAlertContainer from "@/components/ai/VitalsAlertContainer";

export default function OverviewTab() {
  const { data: profile, isLoading: pLoading } = usePatientProfile();
  const { data: medical, isLoading: mLoading } = usePatientMedicalData();

  if (pLoading || mLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-medical animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const allergies = medical?.allergies || [];
  const conditions = medical?.chronic_conditions || [];
  const medications = medical?.current_medications || [];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-medical max-w-full w-full">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Heart className="h-3.5 w-3.5" /> Health ID
          </div>
          <div className="mt-2 text-lg font-bold text-primary font-mono">
            {profile?.health_id || "—"}
          </div>
        </div>
        <div className="card-medical max-w-full w-full">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Droplets className="h-3.5 w-3.5" /> Blood Type
          </div>
          <div className="mt-2 text-3xl font-bold text-primary font-mono">
            {medical?.blood_type || "—"}
          </div>
        </div>
        <div className="card-medical max-w-full w-full">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <AlertTriangle className="h-3.5 w-3.5" /> Allergies
          </div>
          <div className="mt-2 text-2xl font-bold text-emergency">{allergies.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">active alerts</div>
        </div>
        <div className="card-medical max-w-full w-full">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Pill className="h-3.5 w-3.5" /> Medications
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{medications.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">current</div>
        </div>
      </div>

      {/* Allergies & Conditions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-medical max-w-full w-full">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-emergency" /> Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {allergies.length > 0 ? (
              allergies.map((a) => <Badge key={a} variant="emergency">{a}</Badge>)
            ) : (
              <span className="text-xs text-muted-foreground">No allergies recorded</span>
            )}
          </div>
        </div>
        <div className="card-medical max-w-full w-full">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-caution" /> Active Conditions
          </h3>
          <div className="flex flex-wrap gap-2">
            {conditions.length > 0 ? (
              conditions.map((c) => <Badge key={c} variant="caution">{c}</Badge>)
            ) : (
              <span className="text-xs text-muted-foreground">No conditions recorded</span>
            )}
          </div>
        </div>
      </div>


      {/* Vitals */}
      <VitalsCard />
      <VitalsAlertContainer />

      {/* Emergency Contact */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" /> Emergency Contact
        </h3>
        {medical?.emergency_contact_name ? (
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium text-foreground">{medical.emergency_contact_name}</div>
              <div className="text-xs text-muted-foreground">{medical.emergency_contact_relation}</div>
            </div>
            <span className="text-sm text-primary font-mono">{medical.emergency_contact_phone}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No emergency contact set. Add one in the Contacts tab.</p>
        )}
      </div>

      {/* Basic Profile Details */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">Profile Details</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-muted-foreground uppercase tracking-wider">Gender</div>
            <div className="mt-1 text-foreground font-medium">{profile?.gender || "Not set"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-muted-foreground uppercase tracking-wider">Age</div>
            <div className="mt-1 text-foreground font-medium">{profile?.age || "Not set"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-muted-foreground uppercase tracking-wider">Height</div>
            <div className="mt-1 text-foreground font-medium">{profile?.height_cm ? `${profile.height_cm} cm` : "Not set"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-muted-foreground uppercase tracking-wider">Occupation</div>
            <div className="mt-1 text-foreground font-medium">{profile?.occupation || "Not set"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-muted-foreground uppercase tracking-wider">Marital Status</div>
            <div className="mt-1 text-foreground font-medium">{profile?.marital_status || "Not set"}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-muted-foreground uppercase tracking-wider">National ID</div>
            <div className="mt-1 text-foreground font-medium">{profile?.national_id || "Not set"}</div>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs">
          <div className="text-muted-foreground uppercase tracking-wider">Address</div>
          <div className="mt-1 text-foreground font-medium">
            {[profile?.address_street, profile?.address_city, profile?.address_county, profile?.address_country]
              .filter(Boolean)
              .join(", ") || "Not set"}
          </div>
        </div>
      </div>
    </div>
  );
}
