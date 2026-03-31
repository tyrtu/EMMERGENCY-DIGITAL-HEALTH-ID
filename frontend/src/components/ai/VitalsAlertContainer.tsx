import { useQuery } from "@tanstack/react-query";
import { usePatientProfile, usePatientMedicalData, useVitalSigns } from "@/hooks/usePatientData";
import { VitalsAlert } from "@/components/ai/VitalsAlert";
import { apiRequest } from "@/lib/apiClient";
import React from "react";

export default function VitalsAlertContainer() {
  const { data: profile } = usePatientProfile();
  const { data: medical } = usePatientMedicalData();
  const { data: vitals } = useVitalSigns();
  const latest = vitals?.[0];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["llm-vitals", latest, profile, medical],
    enabled: !!latest && !!profile && !!medical,
    queryFn: async () => {
      return await apiRequest("/api/llm-vitals", {
        method: "POST",
        body: JSON.stringify({
          vitals: latest,
          profile,
          medical,
        }),
      });
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const abnormal = data?.advice?.toLowerCase().includes("abnormal") || data?.advice?.toLowerCase().includes("flag") || false;

  return (
    <VitalsAlert
      vitals={latest || {}}
      analysis={isError ? "Could not analyze vitals." : data?.advice || null}
      abnormal={abnormal}
      loading={isLoading}
    />
  );
}
