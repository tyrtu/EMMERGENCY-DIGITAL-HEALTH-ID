import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Droplets, Pill, AlertTriangle, Activity,
  Save, Loader2, X, Plus, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createScanRecord } from "@/hooks/useMedicData";
import ScanNotesPanel from "./ScanNotesPanel";
import type { QRData } from "./QRScanner";

interface PatientDataFormProps {
  qrData: QRData;
  onBack: () => void;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PatientDataForm({ qrData, onBack }: PatientDataFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientUserId, setPatientUserId] = useState<string | null>(null);
  const [scanRecordId, setScanRecordId] = useState<string | null>(null);
  const [patientProfile, setPatientProfile] = useState<{ full_name: string; date_of_birth: string; gender: string; health_id: string } | null>(null);

  // Form state
  const [bloodType, setBloodType] = useState(qrData.blood || "");
  const [allergies, setAllergies] = useState<string[]>(qrData.allergies || []);
  const [allergyInput, setAllergyInput] = useState("");
  const [conditions, setConditions] = useState<string[]>(qrData.conditions || []);
  const [conditionInput, setConditionInput] = useState("");
  const [medications, setMedications] = useState<string[]>(qrData.medications || []);
  const [medicationInput, setMedicationInput] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");

  useEffect(() => {
    lookupPatient();
  }, [qrData.id]);

  const lookupPatient = async () => {
    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, date_of_birth, gender, health_id")
        .eq("health_id", qrData.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast.error("Patient not found with this Health ID");
        onBack();
        return;
      }

      setPatientUserId(profile.user_id);
      setPatientProfile({
        full_name: profile.full_name || "Unknown",
        date_of_birth: profile.date_of_birth || "",
        gender: profile.gender || "",
        health_id: profile.health_id || "",
      });

      // Create a scan record
      if (user) {
        try {
          const record = await createScanRecord(user.id, profile.user_id, qrData.id);
          setScanRecordId(record.id);
          queryClient.invalidateQueries({ queryKey: ["medic-scans"] });
        } catch (e) {
          console.error("Failed to record scan:", e);
        }
      }

      // Fetch existing medical data
      const { data: medical } = await supabase
        .from("patient_medical_data")
        .select("*")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (medical) {
        setBloodType(medical.blood_type || "");
        setAllergies(medical.allergies || []);
        setConditions(medical.chronic_conditions || []);
        setMedications(medical.current_medications || []);
        setInsuranceProvider(medical.insurance_provider || "");
        setInsurancePolicyNumber(medical.insurance_policy_number || "");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to look up patient");
    } finally {
      setLoading(false);
    }
  };

  const addTag = (value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setInput("");
  };

  const removeTag = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((t) => t !== value));
  };

  const handleSave = async () => {
    if (!patientUserId) return;
    setSaving(true);
    try {
      const payload = {
        user_id: patientUserId,
        blood_type: bloodType || null,
        allergies: allergies.length > 0 ? allergies : null,
        chronic_conditions: conditions.length > 0 ? conditions : null,
        current_medications: medications.length > 0 ? medications : null,
        insurance_provider: insuranceProvider || null,
        insurance_policy_number: insurancePolicyNumber || null,
      };

      const { error } = await supabase
        .from("patient_medical_data")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["medic-scans"] });
      toast.success("Patient medical data saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save medical data");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">Patient Medical Data</h2>
          <p className="text-xs text-muted-foreground">Enter or update clinical information</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      {/* Patient Info */}
      {patientProfile && (
        <div className="card-medical flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">{patientProfile.full_name}</div>
            <div className="flex items-center gap-3 mt-0.5">
              <Badge variant="outline" className="font-mono text-[10px]">{patientProfile.health_id}</Badge>
              {patientProfile.date_of_birth && <span className="text-xs text-muted-foreground">DOB: {patientProfile.date_of_birth}</span>}
              {patientProfile.gender && <span className="text-xs text-muted-foreground capitalize">{patientProfile.gender}</span>}
            </div>
          </div>
          {bloodType && (
            <Badge variant="info" className="text-sm font-mono gap-1">
              <Droplets className="h-3.5 w-3.5" /> {bloodType}
            </Badge>
          )}
        </div>
      )}

      {/* Blood Type & Insurance */}
      <div className="card-medical space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary" /> Blood Type & Insurance
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">Blood Type</Label>
            <Select value={bloodType} onValueChange={setBloodType}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Insurance Provider</Label>
            <Input value={insuranceProvider} onChange={(e) => setInsuranceProvider(e.target.value)} placeholder="Provider name" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Policy Number</Label>
            <Input value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)} placeholder="Policy #" className="font-mono" />
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="card-medical space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-emergency" /> Allergies
        </h3>
        <div className="flex flex-wrap gap-2">
          {allergies.map((a) => (
            <Badge key={a} variant="emergency" className="gap-1">
              {a}
              <button onClick={() => removeTag(a, allergies, setAllergies)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Add allergy..." value={allergyInput} onChange={(e) => setAllergyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag(allergyInput, allergies, setAllergies, setAllergyInput)} />
          <Button variant="outline" size="icon" onClick={() => addTag(allergyInput, allergies, setAllergies, setAllergyInput)} disabled={!allergyInput.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conditions */}
      <div className="card-medical space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-caution" /> Chronic Conditions
        </h3>
        <div className="flex flex-wrap gap-2">
          {conditions.map((c) => (
            <Badge key={c} variant="caution" className="gap-1">
              {c}
              <button onClick={() => removeTag(c, conditions, setConditions)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Add condition..." value={conditionInput} onChange={(e) => setConditionInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag(conditionInput, conditions, setConditions, setConditionInput)} />
          <Button variant="outline" size="icon" onClick={() => addTag(conditionInput, conditions, setConditions, setConditionInput)} disabled={!conditionInput.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Medications */}
      <div className="card-medical space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary" /> Current Medications
        </h3>
        <div className="flex flex-wrap gap-2">
          {medications.map((m) => (
            <Badge key={m} variant="info" className="gap-1">
              {m}
              <button onClick={() => removeTag(m, medications, setMedications)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Add medication..." value={medicationInput} onChange={(e) => setMedicationInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag(medicationInput, medications, setMedications, setMedicationInput)} />
          <Button variant="outline" size="icon" onClick={() => addTag(medicationInput, medications, setMedications, setMedicationInput)} disabled={!medicationInput.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notes */}
      {scanRecordId && <ScanNotesPanel scanId={scanRecordId} />}
    </motion.div>
  );
}
