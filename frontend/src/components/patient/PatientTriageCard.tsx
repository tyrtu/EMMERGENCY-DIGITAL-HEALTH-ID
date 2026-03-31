import React from "react";
import { usePatientMedicalData } from "@/hooks/usePatientData";
import { PatientTriageDisplay } from "./PatientTriageDisplay";

export default function PatientTriageCard() {
  const { data: medical, isLoading } = usePatientMedicalData();
  // Compose a patientData object similar to what PatientDataForm sends
  const patientData = {
    bloodType: medical?.blood_type || "",
    allergies: medical?.allergies || [],
    conditions: medical?.chronic_conditions || [],
    medications: medical?.current_medications || [],
    insuranceProvider: medical?.insurance_provider || "",
    insurancePolicyNumber: medical?.insurance_policy_number || "",
    profile: undefined, // Not available in this context
  };
  // Use a local fetch to the backend for triage
  const [triage, setTriage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const { API_BASE_URL } = await import("@/lib/apiClient");
        const res = await fetch(`${API_BASE_URL}/llm-triage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientData }),
        });
        const data = await res.json();
        setTriage(data.triage || null);
      } catch {
        setTriage(null);
      }
      setLoading(false);
    };
    run();
    // eslint-disable-next-line
  }, [JSON.stringify(patientData)]);
  return <PatientTriageDisplay triageText={triage} loading={loading || isLoading} />;
}
