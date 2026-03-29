import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, User, Phone, ChevronRight, ChevronLeft, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/apiClient";

const steps = [
  { icon: User, title: "Personal Info", description: "Your basic identity details" },
  { icon: Phone, title: "Emergency Contact", description: "Who should we call in an emergency?" },
];

export default function PatientOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Personal info
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await apiRequest(`/api/patients/${user.id}/basic-info`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: fullName || null,
          dob: dob || null,
          gender: gender || null,
          contact: {
            phone: phone || null,
            email: user.email || null,
          },
        }),
      });

      const patientResponse = await apiRequest<any>(`/api/patients/${user.id}`);
      const patientId = patientResponse?.data?._id;

      if (patientId && emergencyName && emergencyPhone) {
        await apiRequest("/api/emergency-contacts", {
          method: "POST",
          body: JSON.stringify({
            patient: patientId,
            name: emergencyName,
            relationship: emergencyRelation || "Emergency Contact",
            phone: emergencyPhone,
          }),
        });
      }

      toast({ title: "Profile complete!", description: "Your information has been saved. Medical data will be added by your healthcare provider." });
      navigate("/patient/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return fullName.trim() !== "";
    if (step === 1) return emergencyName.trim() !== "" && emergencyPhone.trim() !== "";
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
            <Heart className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in your personal details. Medical data (blood type, allergies, medications) will be entered by your healthcare provider.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {(() => {
            const StepIcon = steps[step].icon;
            return (
              <>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <StepIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{steps[step].title}</p>
                  <p className="text-xs text-muted-foreground">{steps[step].description}</p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Full Name *</Label>
                    <Input className="mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div>
                    <Label className="text-sm">Date of Birth</Label>
                    <Input className="mt-1.5" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-sm">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Phone Number</Label>
                    <Input className="mt-1.5" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Contact Name *</Label>
                    <Input className="mt-1.5" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="e.g. Jane Doe" />
                  </div>
                  <div>
                    <Label className="text-sm">Phone Number *</Label>
                    <Input className="mt-1.5" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="e.g. +1 555 123 4567" type="tel" />
                  </div>
                  <div>
                    <Label className="text-sm">Relationship</Label>
                    <Input className="mt-1.5" value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} placeholder="e.g. Spouse, Parent" />
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border p-3 mt-4">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Note:</strong> Medical information such as blood type, allergies, medications, and chronic conditions will be entered by your healthcare provider during your visit.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={!canAdvance() || saving}>
                {saving ? "Saving…" : <><Check className="h-4 w-4 mr-1" /> Complete</>}
              </Button>
            )}
          </div>
        </div>

        {/* Skip */}
        <div className="text-center mt-4">
          <button onClick={() => navigate("/patient/dashboard")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
