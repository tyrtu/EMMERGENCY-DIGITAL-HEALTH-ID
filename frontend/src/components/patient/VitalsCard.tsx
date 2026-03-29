import { Heart, Ruler, Weight, Thermometer, Wind, Activity } from "lucide-react";
import { useVitalSigns } from "@/hooks/usePatientData";
import { format } from "date-fns";

const vitalConfig = [
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", icon: Heart, color: "text-emergency" },
  { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg", icon: Activity, color: "text-primary" },
  { key: "temperature", label: "Temperature", unit: "°C", icon: Thermometer, color: "text-caution" },
  { key: "oxygen_saturation", label: "SpO₂", unit: "%", icon: Wind, color: "text-safe" },
  { key: "height_cm", label: "Height", unit: "cm", icon: Ruler, color: "text-primary" },
  { key: "weight_kg", label: "Weight", unit: "kg", icon: Weight, color: "text-foreground" },
] as const;

export default function VitalsCard() {
  const { data: vitals, isLoading } = useVitalSigns();
  const latest = vitals?.[0];

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card-medical animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const getValue = (key: string) => {
    if (!latest) return "—";
    if (key === "blood_pressure") {
      const sys = latest.blood_pressure_systolic;
      const dia = latest.blood_pressure_diastolic;
      return sys && dia ? `${sys}/${dia}` : "—";
    }
    const val = latest[key as keyof typeof latest];
    return val != null ? String(val) : "—";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Latest Vitals</h3>
        {latest && (
          <span className="text-xs text-muted-foreground">
            Recorded {format(new Date(latest.recorded_at), "MMM d, yyyy")}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vitalConfig.map(({ key, label, unit, icon: Icon, color }) => (
          <div key={key} className="card-medical flex items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground font-mono">{getValue(key)}</span>
                <span className="text-xs text-muted-foreground">{unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!latest && (
        <p className="text-xs text-muted-foreground mt-3 text-center">No vitals recorded yet. They will appear here after a medic records them.</p>
      )}
    </div>
  );
}
