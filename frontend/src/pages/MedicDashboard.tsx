import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, ScanLine, Clock, BarChart3, User, LogOut,
  Droplets, Search, FileText, Loader2, Menu, Stethoscope,
  Users, AlertTriangle, Plus, Trash2, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import QRScanner, { type QRData } from "@/components/medic/QRScanner";
import PatientDataForm from "@/components/medic/PatientDataForm";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentScans, type ScanRecord } from "@/hooks/useMedicData";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/apiClient";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

type MedicView = "scans" | "analytics" | "search" | "profile" | "casualty";
type TriageLevel = "critical" | "caution" | "normal";

interface CasualtyRecord extends QRData {
  scannedAt: string;
  triage: TriageLevel;
}

interface PatientEditDraft {
  authId: string;
  healthId: string;
  fullName: string;
  bloodGroup: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  country: string;
  allergiesText: string;
  conditionsText: string;
  medicationsText: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  preferredHospitalName: string;
  preferredHospitalPhone: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  criticalNotes: string;
}

interface MedicProfileDraft {
  id: string | null;
  authId: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  verified: boolean;
}

interface MedicRecordLite {
  _id?: string;
  authId?: string;
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
  verified?: boolean;
}

interface PatientRecordLite {
  authId?: string;
  healthId?: string;
  basicInfo?: {
    fullName?: string;
    bloodGroup?: string;
    contact?: { phone?: string; email?: string };
    address?: { city?: string; country?: string };
  };
  emergencyInfo?: {
    primaryEmergencyContacts?: { name?: string; relation?: string; phone?: string; isPrimary?: boolean }[];
    criticalAllergies?: string[];
    criticalConditions?: string[];
    currentMedications?: string[];
    preferredHospitalInEmergency?: { name?: string; phone?: string };
    criticalNotes?: string;
  };
  medicalInfo?: {
    insurance?: { provider?: string; policyNumber?: string };
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeHealthId(value: string): string {
  return value.trim().toUpperCase();
}

function splitLinesToArray(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function computeTriage(data: Pick<QRData, "allergies" | "conditions">): TriageLevel {
  const allergies = data.allergies?.length || 0;
  const conditions = data.conditions?.length || 0;
  if (allergies + conditions >= 3) return "critical";
  if (allergies + conditions >= 1) return "caution";
  return "normal";
}

function toPatientEditDraft(patient: PatientRecordLite): PatientEditDraft {
  const emergencyContact = patient?.emergencyInfo?.primaryEmergencyContacts?.[0] || {};
  return {
    authId: String(patient?.authId || ""),
    healthId: String(patient?.healthId || ""),
    fullName: String(patient?.basicInfo?.fullName || "Unknown"),
    bloodGroup: String(patient?.basicInfo?.bloodGroup || "Unknown"),
    contactPhone: String(patient?.basicInfo?.contact?.phone || ""),
    contactEmail: String(patient?.basicInfo?.contact?.email || ""),
    city: String(patient?.basicInfo?.address?.city || ""),
    country: String(patient?.basicInfo?.address?.country || ""),
    allergiesText: String((patient?.emergencyInfo?.criticalAllergies || []).join("\n")),
    conditionsText: String((patient?.emergencyInfo?.criticalConditions || []).join("\n")),
    medicationsText: String((patient?.emergencyInfo?.currentMedications || []).join("\n")),
    emergencyContactName: String(emergencyContact?.name || ""),
    emergencyContactRelation: String(emergencyContact?.relation || ""),
    emergencyContactPhone: String(emergencyContact?.phone || ""),
    preferredHospitalName: String(patient?.emergencyInfo?.preferredHospitalInEmergency?.name || ""),
    preferredHospitalPhone: String(patient?.emergencyInfo?.preferredHospitalInEmergency?.phone || ""),
    insuranceProvider: String(patient?.medicalInfo?.insurance?.provider || ""),
    insurancePolicyNumber: String(patient?.medicalInfo?.insurance?.policyNumber || ""),
    criticalNotes: String(patient?.emergencyInfo?.criticalNotes || ""),
  };
}

function safeDistanceFromNow(value: string | null | undefined): string {
  if (!value) return "unknown time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "unknown time";
  return formatDistanceToNow(parsed, { addSuffix: true });
}

function AnalyticsView({ scans }: { scans: ScanRecord[] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCounts = new Array(7).fill(0);
  const now = new Date();

  scans.forEach((s) => {
    const d = new Date(s.created_at);
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 7) {
      dayCounts[d.getDay()]++;
    }
  });

  const maxCount = Math.max(...dayCounts, 1);

  const conditionCounts: Record<string, number> = {};
  scans.forEach((s) => {
    (s.chronic_conditions || []).forEach((c) => {
      conditionCounts[c] = (conditionCounts[c] || 0) + 1;
    });
  });
  const topConditions = Object.entries(conditionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4">Scan Volume (7 Days)</h3>
        <div className="space-y-3">
          {days.map((day, i) => (
            <div key={day} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8">{day}</span>
              <div className="flex-1 bg-muted rounded-full h-2.5">
                <div
                  className="bg-primary rounded-full h-2.5 transition-all"
                  style={{ width: `${(dayCounts[i] / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-foreground w-6 text-right">{dayCounts[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Conditions</h3>
        {topConditions.length > 0 ? (
          <div className="space-y-3">
            {topConditions.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <Badge variant="secondary">{name}</Badge>
                <span className="text-sm font-medium text-foreground">{count} patients</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No condition data yet</p>
        )}
      </div>
    </div>
  );
}

export default function MedicDashboard() {
  const { signOut, user } = useAuth();
  const { data: scans, isLoading: scansLoading } = useRecentScans();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedPatient, setScannedPatient] = useState<QRData | null>(null);
  const [activeView, setActiveView] = useState<MedicView>(() => {
    const allowedViews: MedicView[] = ["scans", "analytics", "search", "profile", "casualty"];
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl && allowedViews.includes(tabFromUrl as MedicView)) {
      return tabFromUrl as MedicView;
    }
    const savedTab = localStorage.getItem("medicDashboard_activeTab");
    if (savedTab && allowedViews.includes(savedTab as MedicView)) {
      return savedTab as MedicView;
    }
    return "scans";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [isMultiCasualtyMode, setIsMultiCasualtyMode] = useState(false);
  const [casualtyList, setCasualtyList] = useState<CasualtyRecord[]>([]);
  const [selectedCasualtyIndex, setSelectedCasualtyIndex] = useState<number | null>(null);
  const [incidentAlert, setIncidentAlert] = useState<{ message: string; severity: "warning" | "success" } | null>(null);

  const [emrQuery, setEmrQuery] = useState("");
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [patientDraft, setPatientDraft] = useState<PatientEditDraft | null>(null);
  const [savingPatient, setSavingPatient] = useState(false);

  const [loadingMedicProfile, setLoadingMedicProfile] = useState(false);
  const [savingMedicProfile, setSavingMedicProfile] = useState(false);
  const [medicProfileDraft, setMedicProfileDraft] = useState<MedicProfileDraft | null>(null);

  const selectedCasualty = selectedCasualtyIndex !== null ? casualtyList[selectedCasualtyIndex] || null : null;

  useEffect(() => {
    if (searchQuery.trim()) return;
    setVisibleCount(8);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem("medicDashboard_activeTab", activeView);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeView);
    window.history.replaceState({}, "", url.toString());
  }, [activeView]);

  useEffect(() => {
    if (!incidentAlert) return;
    const timer = window.setTimeout(() => setIncidentAlert(null), incidentAlert.severity === "warning" ? 5000 : 2500);
    return () => window.clearTimeout(timer);
  }, [incidentAlert]);

  useEffect(() => {
    const loadMedicProfile = async () => {
      if (!user?.id) return;
      setLoadingMedicProfile(true);
      try {
        const response = await apiRequest<{ data?: MedicRecordLite[] }>("/api/medics");
        const medics = Array.isArray(response?.data) ? response.data : [];
        const matched = medics.find(
          (medic) => medic?.authId === user.id || (user.email && medic?.email === user.email),
        );
        if (matched) {
          setMedicProfileDraft({
            id: String(matched._id || ""),
            authId: String(matched.authId || user.id),
            name: String(matched.name || ""),
            email: String(matched.email || user.email || ""),
            phone: String(matched.phone || ""),
            specialization: String(matched.specialization || ""),
            licenseNumber: String(matched.licenseNumber || ""),
            verified: Boolean(matched.verified),
          });
          return;
        }
      } catch {
        // Fallback draft below
      } finally {
        setLoadingMedicProfile(false);
      }
      setMedicProfileDraft({
        id: null,
        authId: user.id,
        name: String(user.user_metadata?.full_name || user.email?.split("@")[0] || "Medic"),
        email: String(user.email || ""),
        phone: "",
        specialization: "General Practice",
        licenseNumber: "",
        verified: false,
      });
    };
    void loadMedicProfile();
  }, [user?.id, user?.email, user?.user_metadata]);

  const getStatusBadgeVariant = (status: string | undefined) => {
    const normalized = String(status || "normal").toLowerCase();
    if (normalized === "critical") return "emergency" as const;
    if (normalized === "caution") return "caution" as const;
    if (normalized === "resolved") return "safe" as const;
    return "info" as const;
  };

  const updatePatientDraft = (field: keyof PatientEditDraft, value: string) => {
    setPatientDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const updateMedicDraft = (field: keyof MedicProfileDraft, value: string | boolean) => {
    setMedicProfileDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value } as MedicProfileDraft;
    });
  };

  const findPatientByEmr = async () => {
    const normalized = normalizeHealthId(emrQuery);
    if (!/^EMH-\d{6}$/i.test(normalized)) {
      setSearchError("Use a valid EMR ID format: EMH-XXXXXX");
      setPatientDraft(null);
      return;
    }
    setSearchingPatient(true);
    setSearchError(null);
    try {
      const response = await apiRequest<{ data?: PatientRecordLite }>(`/api/patients/${encodeURIComponent(normalized)}`);
      if (!response?.data) {
        setSearchError("Patient not found for that EMR ID.");
        setPatientDraft(null);
        return;
      }
      setPatientDraft(toPatientEditDraft(response.data));
      toast.success("Patient record loaded.");
    } catch (error: unknown) {
      setSearchError(getErrorMessage(error, "Failed to search patient."));
      setPatientDraft(null);
    } finally {
      setSearchingPatient(false);
    }
  };

  const savePatientProfile = async () => {
    if (!patientDraft?.authId) return;
    setSavingPatient(true);
    try {
      const payload = {
        basicInfo: {
          bloodGroup: patientDraft.bloodGroup || "Unknown",
          contact: {
            phone: patientDraft.contactPhone || "",
            email: patientDraft.contactEmail || "",
          },
          address: {
            city: patientDraft.city || "",
            country: patientDraft.country || "",
          },
        },
        emergencyInfo: {
          primaryEmergencyContacts: [
            {
              name: patientDraft.emergencyContactName || "",
              relation: patientDraft.emergencyContactRelation || "",
              phone: patientDraft.emergencyContactPhone || "",
              isPrimary: true,
            },
          ].filter((contact) => contact.name || contact.phone),
          criticalAllergies: splitLinesToArray(patientDraft.allergiesText),
          criticalConditions: splitLinesToArray(patientDraft.conditionsText),
          currentMedications: splitLinesToArray(patientDraft.medicationsText),
          criticalNotes: patientDraft.criticalNotes || "",
          preferredHospitalInEmergency: {
            name: patientDraft.preferredHospitalName || "",
            phone: patientDraft.preferredHospitalPhone || "",
          },
        },
        medicalInfo: {
          insurance: {
            provider: patientDraft.insuranceProvider || "",
            policyNumber: patientDraft.insurancePolicyNumber || "",
          },
        },
      };
      await apiRequest(`/api/patients/${encodeURIComponent(patientDraft.authId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Patient profile updated successfully.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update patient profile."));
    } finally {
      setSavingPatient(false);
    }
  };

  const saveMedicProfile = async () => {
    if (!medicProfileDraft) return;
    if (!medicProfileDraft.name.trim() || !medicProfileDraft.email.trim() || !medicProfileDraft.licenseNumber.trim()) {
      toast.error("Name, email, and license number are required.");
      return;
    }
    setSavingMedicProfile(true);
    try {
      const payload = {
        authId: medicProfileDraft.authId || user?.id,
        name: medicProfileDraft.name.trim(),
        email: medicProfileDraft.email.trim(),
        phone: medicProfileDraft.phone.trim(),
        specialization: medicProfileDraft.specialization.trim(),
        licenseNumber: medicProfileDraft.licenseNumber.trim(),
        verified: medicProfileDraft.verified,
      };
      if (medicProfileDraft.id) {
        await apiRequest(`/api/medics/${encodeURIComponent(medicProfileDraft.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const createResponse = await apiRequest<{ data?: { _id?: string } }>("/api/medics", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const createdId = String(createResponse?.data?._id || "");
        setMedicProfileDraft((prev) => (prev ? { ...prev, id: createdId || null } : prev));
      }
      toast.success("Medic profile saved.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save medic profile."));
    } finally {
      setSavingMedicProfile(false);
    }
  };

  const handleScanResult = (data: QRData) => {
    setShowScanner(false);
    if (isMultiCasualtyMode) {
      const incomingId = normalizeHealthId(data.id);
      const duplicateIndex = casualtyList.findIndex((entry) => normalizeHealthId(entry.id) === incomingId);
      if (duplicateIndex >= 0) {
        setSelectedCasualtyIndex(duplicateIndex);
        setIncidentAlert({ message: `${data.name || "Patient"} is already in the casualty list.`, severity: "warning" });
        return;
      }
      const newCasualty: CasualtyRecord = {
        ...data,
        id: incomingId,
        scannedAt: new Date().toISOString(),
        triage: computeTriage(data),
      };
      setCasualtyList((prev) => {
        const next = [...prev, newCasualty];
        setSelectedCasualtyIndex(next.length - 1);
        return next;
      });
      setIncidentAlert({ message: `${data.name || incomingId} added to multi-casualty triage.`, severity: "success" });
      setActiveView("casualty");
      return;
    }
    setScannedPatient(data);
  };

  const casualtyStats = useMemo(() => {
    const critical = casualtyList.filter((e) => e.triage === "critical").length;
    const caution = casualtyList.filter((e) => e.triage === "caution").length;
    const normal = casualtyList.filter((e) => e.triage === "normal").length;
    return { critical, caution, normal };
  }, [casualtyList]);

  const sortedScans = [...(scans || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const filteredScans = sortedScans.filter((s) =>
    !searchQuery ||
    s.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.patient_health_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const LATEST_SCAN_LIMIT = 8;
  const scansToDisplay = searchQuery.trim() ? filteredScans : filteredScans.slice(0, visibleCount);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scansToday = (scans || []).filter((s) => new Date(s.created_at) >= today).length;
  const uniquePatients = new Set((scans || []).map((s) => s.patient_user_id)).size;
  const withAllergies = (scans || []).filter((s) => s.allergies && s.allergies.length > 0).length;

  const stats = [
    { label: "Scans Today", value: String(scansToday) },
    { label: "Total Scans", value: String((scans || []).length) },
    { label: "Unique Patients", value: String(uniquePatients) },
    { label: "With Allergies", value: String(withAllergies) },
  ];

  if (scannedPatient) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">Medic Portal</span>
          </Link>
        </header>
        <div className="flex-1 p-6">
          <PatientDataForm qrData={scannedPatient} onBack={() => setScannedPatient(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">Medic Portal</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {(["scans", "analytics", "search", "casualty", "profile"] as MedicView[]).map((view) => {
            const icons: Record<MedicView, React.ReactNode> = {
              scans: <Clock className="h-4 w-4" />,
              analytics: <BarChart3 className="h-4 w-4" />,
              search: <Search className="h-4 w-4" />,
              casualty: <Users className="h-4 w-4" />,
              profile: <Stethoscope className="h-4 w-4" />,
            };
            const labels: Record<MedicView, string> = {
              scans: "Recent Scans",
              analytics: "Analytics",
              search: "Patient Search",
              casualty: "Multi-Casualty",
              profile: "My Profile",
            };
            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeView === view
                    ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {icons[view]}
                {labels[view]}
              </button>
            );
          })}
          <button
            onClick={() => setShowScanner(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <ScanLine className="h-4 w-4" />
            Scan QR
          </button>
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => void signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">Medic Portal</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] max-w-sm">
                  <SheetHeader>
                    <SheetTitle>Medic Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    {(["scans", "analytics", "search", "casualty", "profile"] as MedicView[]).map((view) => {
                      const icons: Record<MedicView, React.ReactNode> = {
                        scans: <Clock className="h-4 w-4" />,
                        analytics: <BarChart3 className="h-4 w-4" />,
                        search: <Search className="h-4 w-4" />,
                        casualty: <Users className="h-4 w-4" />,
                        profile: <Stethoscope className="h-4 w-4" />,
                      };
                      const labels: Record<MedicView, string> = {
                        scans: "Recent Scans",
                        analytics: "Analytics",
                        search: "Patient Search",
                        casualty: "Multi-Casualty",
                        profile: "My Profile",
                      };
                      return (
                        <SheetClose asChild key={view}>
                          <button
                            onClick={() => setActiveView(view)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                              activeView === view ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {icons[view]}
                            {labels[view]}
                          </button>
                        </SheetClose>
                      );
                    })}
                    <SheetClose asChild>
                      <button
                        onClick={() => setShowScanner(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      >
                        <ScanLine className="h-4 w-4" /> Scan QR
                      </button>
                    </SheetClose>
                    <SheetClose asChild>
                      <button
                        onClick={() => void signOut()}
                        className="w-full mt-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6 pb-24 sm:pb-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-medical"
              >
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Tab bar - desktop */}
          <div className="hidden sm:flex items-center justify-between mb-4">
            <div className="flex rounded-lg border border-border p-1 bg-muted/50 overflow-x-auto">
              {(["scans", "analytics", "search", "casualty", "profile"] as MedicView[]).map((view) => {
                const icons: Record<MedicView, React.ReactNode> = {
                  scans: <Clock className="h-3.5 w-3.5" />,
                  analytics: <BarChart3 className="h-3.5 w-3.5" />,
                  search: <Search className="h-3.5 w-3.5" />,
                  casualty: <Users className="h-3.5 w-3.5" />,
                  profile: <Stethoscope className="h-3.5 w-3.5" />,
                };
                const labels: Record<MedicView, string> = {
                  scans: "Recent Scans",
                  analytics: "Analytics",
                  search: "Patient Search",
                  casualty: "Multi-Casualty",
                  profile: "My Profile",
                };
                return (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeView === view ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {icons[view]} {labels[view]}
                  </button>
                );
              })}
            </div>
            {activeView === "scans" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === "scans" && (
              <div className="space-y-3">
                {!searchQuery && filteredScans.length > LATEST_SCAN_LIMIT && (
                  <div className="text-xs text-muted-foreground">
                    Showing latest {Math.min(visibleCount, filteredScans.length)} of {filteredScans.length} scans.
                  </div>
                )}
                {scansLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : scansToDisplay.length === 0 ? (
                  <div className="card-medical text-center py-12">
                    <ScanLine className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "No matching scans found" : "No scans yet — tap the scan button to get started"}
                    </p>
                  </div>
                ) : (
                  scansToDisplay.map((scan) => (
                    <div
                      key={scan.id}
                      className="card-medical hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => {
                        setScannedPatient({
                          v: 1,
                          id: scan.patient_health_id || "",
                          name: scan.patient_name || "",
                          dob: "",
                          gender: "",
                          blood: scan.blood_type || "",
                          allergies: scan.allergies || [],
                          conditions: scan.chronic_conditions || [],
                          medications: [],
                          emergency: null,
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{scan.patient_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground font-mono">
                                EMR: {scan.patient_health_id || "Not resolved"}
                              </span>
                              {scan.blood_type && (
                                <>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                    <Droplets className="h-3 w-3" /> {scan.blood_type}
                                  </span>
                                </>
                              )}
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {safeDistanceFromNow(scan.created_at)}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge variant={getStatusBadgeVariant(scan.scan_status)} className="text-[10px] uppercase tracking-wide">
                                {scan.scan_status || "normal"}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {scan.scan_type || "Emergency"}
                              </Badge>
                              {typeof scan.response_time === "number" && scan.response_time > 0 && (
                                <span className="text-[10px] text-muted-foreground">Response: {Math.round(scan.response_time)}s</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex flex-wrap gap-1 max-w-xs justify-end">
                            {(scan.chronic_conditions || []).slice(0, 3).map((c) => (
                              <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                            ))}
                            {(scan.allergies || []).length > 0 && (
                              <Badge variant="emergency" className="text-[10px]">
                                {scan.allergies!.length} allerg{scan.allergies!.length > 1 ? "ies" : "y"}
                              </Badge>
                            )}
                          </div>
                          {scan.notes && <FileText className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {!searchQuery && filteredScans.length > scansToDisplay.length && (
                  <div className="pt-2 flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => setVisibleCount((prev) => prev + LATEST_SCAN_LIMIT)}>
                      View More (+{LATEST_SCAN_LIMIT})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeView === "analytics" && <AnalyticsView scans={scans || []} />}

            {activeView === "search" && (
              <div className="space-y-4">
                <div className="card-medical space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Find Patient By EMR ID</h3>
                      <p className="text-xs text-muted-foreground">Search EMH-XXXXXX and update missing emergency profile fields.</p>
                    </div>
                    <Badge variant="info">Medic Access</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      value={emrQuery}
                      onChange={(e) => setEmrQuery(e.target.value.toUpperCase())}
                      placeholder="EMH-123456"
                      className="font-mono sm:max-w-xs"
                      onKeyDown={(e) => e.key === "Enter" && void findPatientByEmr()}
                    />
                    <Button onClick={() => void findPatientByEmr()} disabled={searchingPatient}>
                      {searchingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Search
                    </Button>
                    {patientDraft?.healthId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setScannedPatient({
                            v: 1,
                            id: patientDraft.healthId,
                            name: patientDraft.fullName,
                            dob: "",
                            gender: "",
                            blood: patientDraft.bloodGroup,
                            allergies: splitLinesToArray(patientDraft.allergiesText),
                            conditions: splitLinesToArray(patientDraft.conditionsText),
                            medications: splitLinesToArray(patientDraft.medicationsText),
                            emergency: patientDraft.emergencyContactName
                              ? {
                                  name: patientDraft.emergencyContactName,
                                  phone: patientDraft.emergencyContactPhone,
                                  relation: patientDraft.emergencyContactRelation,
                                }
                              : null,
                          });
                        }}
                      >
                        Open Full Editor
                      </Button>
                    )}
                  </div>
                  {searchError && (
                    <div className="rounded-lg border border-emergency/30 bg-emergency/5 p-3 text-xs text-emergency flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> {searchError}
                    </div>
                  )}
                </div>

                {patientDraft && (
                  <div className="card-medical space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{patientDraft.fullName}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{patientDraft.healthId} • authId: {patientDraft.authId}</p>
                      </div>
                      <Button onClick={() => void savePatientProfile()} disabled={savingPatient}>
                        {savingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Patient Updates
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { label: "Blood Group", field: "bloodGroup" },
                        { label: "Contact Phone", field: "contactPhone" },
                        { label: "Contact Email", field: "contactEmail" },
                        { label: "City", field: "city" },
                        { label: "Country", field: "country" },
                        { label: "Preferred Hospital Name", field: "preferredHospitalName" },
                        { label: "Preferred Hospital Phone", field: "preferredHospitalPhone" },
                        { label: "Insurance Provider", field: "insuranceProvider" },
                        { label: "Policy Number", field: "insurancePolicyNumber" },
                      ].map(({ label, field }) => (
                        <div key={field} className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <Input
                            value={patientDraft[field as keyof PatientEditDraft] as string}
                            onChange={(e) => updatePatientDraft(field as keyof PatientEditDraft, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        { label: "Emergency Contact Name", field: "emergencyContactName" },
                        { label: "Relationship", field: "emergencyContactRelation" },
                        { label: "Emergency Contact Phone", field: "emergencyContactPhone" },
                      ].map(({ label, field }) => (
                        <div key={field} className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <Input
                            value={patientDraft[field as keyof PatientEditDraft] as string}
                            onChange={(e) => updatePatientDraft(field as keyof PatientEditDraft, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        { label: "Critical Allergies (line or comma separated)", field: "allergiesText" },
                        { label: "Critical Conditions (line or comma separated)", field: "conditionsText" },
                        { label: "Current Medications (line or comma separated)", field: "medicationsText" },
                      ].map(({ label, field }) => (
                        <div key={field} className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <Textarea
                            value={patientDraft[field as keyof PatientEditDraft] as string}
                            onChange={(e) => updatePatientDraft(field as keyof PatientEditDraft, e.target.value)}
                            rows={5}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Critical Notes</p>
                      <Textarea value={patientDraft.criticalNotes} onChange={(e) => updatePatientDraft("criticalNotes", e.target.value)} rows={4} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === "profile" && (
              <div className="card-medical space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Medic Profile</h3>
                    <p className="text-xs text-muted-foreground">Keep your clinician identity complete for auditing and emergency operations.</p>
                  </div>
                  <Badge variant={medicProfileDraft?.verified ? "safe" : "caution"}>
                    {medicProfileDraft?.verified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                {loadingMedicProfile || !medicProfileDraft ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { label: "Full Name", field: "name" },
                        { label: "Email", field: "email" },
                        { label: "Phone", field: "phone" },
                        { label: "Specialization", field: "specialization" },
                        { label: "License Number", field: "licenseNumber" },
                        { label: "Auth ID", field: "authId" },
                      ].map(({ label, field }) => (
                        <div key={field} className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <Input
                            value={medicProfileDraft[field as keyof MedicProfileDraft] as string}
                            onChange={(e) => updateMedicDraft(field as keyof MedicProfileDraft, e.target.value)}
                            className={field === "authId" ? "font-mono" : ""}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => void saveMedicProfile()} disabled={savingMedicProfile}>
                        {savingMedicProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Profile
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeView === "casualty" && (
              <div className="space-y-4">
                <div className="card-medical space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Multi-Casualty Triage</h3>
                      <p className="text-xs text-muted-foreground">Scan multiple patients quickly and prevent accidental duplicates.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isMultiCasualtyMode ? "destructive" : "outline"}
                        onClick={() => {
                          setIsMultiCasualtyMode((prev) => !prev);
                          if (isMultiCasualtyMode) setIncidentAlert(null);
                        }}
                      >
                        <Users className="h-4 w-4" />
                        {isMultiCasualtyMode ? "Disable Mode" : "Enable Mode"}
                      </Button>
                      <Button onClick={() => setShowScanner(true)}>
                        <ScanLine className="h-4 w-4" />
                        Scan Patient
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-emergency/30 bg-emergency/5 p-3">
                      <p className="text-xs text-muted-foreground">Critical</p>
                      <p className="text-xl font-bold text-emergency">{casualtyStats.critical}</p>
                    </div>
                    <div className="rounded-lg border border-caution/30 bg-caution/5 p-3">
                      <p className="text-xs text-muted-foreground">Caution</p>
                      <p className="text-xl font-bold text-caution">{casualtyStats.caution}</p>
                    </div>
                    <div className="rounded-lg border border-safe/30 bg-safe/5 p-3">
                      <p className="text-xs text-muted-foreground">Normal</p>
                      <p className="text-xl font-bold text-safe">{casualtyStats.normal}</p>
                    </div>
                  </div>
                  {incidentAlert && (
                    <div className={`rounded-lg p-3 text-xs flex items-center gap-2 ${incidentAlert.severity === "warning" ? "border border-caution/40 bg-caution/10 text-caution" : "border border-safe/40 bg-safe/10 text-safe"}`}>
                      <AlertTriangle className="h-4 w-4" /> {incidentAlert.message}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                  <div className="card-medical space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Casualty Queue</h4>
                      <Badge variant="outline">{casualtyList.length}</Badge>
                    </div>
                    {casualtyList.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4">No scanned patients yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                        {casualtyList.map((entry, index) => (
                          <button
                            key={`${entry.id}-${entry.scannedAt}`}
                            onClick={() => setSelectedCasualtyIndex(index)}
                            className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedCasualtyIndex === index ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{entry.name || "Unknown"}</p>
                                <p className="text-[11px] text-muted-foreground font-mono">{entry.id}</p>
                              </div>
                              <Badge variant={getStatusBadgeVariant(entry.triage)} className="uppercase text-[10px]">
                                {entry.triage}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Scanned {safeDistanceFromNow(entry.scannedAt)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setCasualtyList([]); setSelectedCasualtyIndex(null); setIncidentAlert(null); }}
                      disabled={casualtyList.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear Queue
                    </Button>
                  </div>

                  <div className="card-medical">
                    {!selectedCasualty ? (
                      <div className="py-16 text-center">
                        <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Select a casualty from the queue to review details.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{selectedCasualty.name || "Unknown Patient"}</h4>
                            <p className="text-xs text-muted-foreground font-mono">{selectedCasualty.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(selectedCasualty.triage)} className="uppercase text-[10px]">
                              {selectedCasualty.triage}
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => setScannedPatient(selectedCasualty)}>
                              Open Full Editor
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (selectedCasualtyIndex === null) return;
                                setCasualtyList((prev) => {
                                  const next = prev.filter((_, idx) => idx !== selectedCasualtyIndex);
                                  setSelectedCasualtyIndex(next.length ? Math.min(selectedCasualtyIndex, next.length - 1) : null);
                                  return next;
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">Blood Group</p>
                            <p className="text-sm font-semibold text-foreground">{selectedCasualty.blood || "Unknown"}</p>
                          </div>
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">Allergies</p>
                            <p className="text-sm font-semibold text-foreground">{selectedCasualty.allergies.length}</p>
                          </div>
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground">Conditions</p>
                            <p className="text-sm font-semibold text-foreground">{selectedCasualty.conditions.length}</p>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground mb-2">Critical Allergies</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedCasualty.allergies.length > 0
                                ? selectedCasualty.allergies.map((item) => <Badge key={item} variant="emergency" className="text-[10px]">{item}</Badge>)
                                : <p className="text-xs text-muted-foreground">None listed</p>}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border p-3">
                            <p className="text-xs text-muted-foreground mb-2">Critical Conditions</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedCasualty.conditions.length > 0
                                ? selectedCasualty.conditions.map((item) => <Badge key={item} variant="caution" className="text-[10px]">{item}</Badge>)
                                : <p className="text-xs text-muted-foreground">None listed</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Sticky mobile tab bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-card border-t border-border flex justify-around py-2 shadow-lg">
          {([
            { view: "scans", icon: <Clock className="h-5 w-5 mb-0.5" />, label: "Scans" },
            { view: "analytics", icon: <BarChart3 className="h-5 w-5 mb-0.5" />, label: "Analytics" },
            { view: "search", icon: <Search className="h-5 w-5 mb-0.5" />, label: "Search" },
            { view: "casualty", icon: <Users className="h-5 w-5 mb-0.5" />, label: "Casualty" },
            { view: "profile", icon: <Stethoscope className="h-5 w-5 mb-0.5" />, label: "Profile" },
          ] as { view: MedicView; icon: React.ReactNode; label: string }[]).map(({ view, icon, label }) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`flex flex-col items-center gap-0.5 px-2 text-xs font-medium ${activeView === view ? "text-primary" : "text-muted-foreground"}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {showScanner && <QRScanner onScanResult={handleScanResult} onClose={() => setShowScanner(false)} />}

      <button
        onClick={() => setShowScanner(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-40"
      >
        <ScanLine className="h-6 w-6" />
      </button>
    </div>
  );
}