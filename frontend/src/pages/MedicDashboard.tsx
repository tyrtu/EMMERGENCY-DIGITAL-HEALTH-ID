import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, ScanLine, Clock, BarChart3, User, LogOut,
  Droplets, Search, FileText, Loader2, Menu, Stethoscope,
  Users, AlertTriangle, Trash2, Save, X,
} from "lucide-react";
import AvatarUpload from "@/components/patient/AvatarUpload";
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface MedicRecordLite {
  _id?: string;
  authId?: string;
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  licenseNumber?: string;
  verified?: boolean;
  avatar_url?: string | null;
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
  avatar_url?: string | null;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeHealthId(value: string): string {
  return value.trim().toUpperCase();
}

function splitLinesToArray(value: string): string[] {
  return value.split(/\n|,/).map((i) => i.trim()).filter(Boolean);
}

function computeTriage(data: Pick<QRData, "allergies" | "conditions">): TriageLevel {
  const total = (data.allergies?.length || 0) + (data.conditions?.length || 0);
  if (total >= 3) return "critical";
  if (total >= 1) return "caution";
  return "normal";
}

function toPatientEditDraft(patient: PatientRecordLite): PatientEditDraft {
  const ec = patient?.emergencyInfo?.primaryEmergencyContacts?.[0] || {};
  return {
    authId: String(patient?.authId || ""),
    healthId: String(patient?.healthId || ""),
    fullName: String(patient?.basicInfo?.fullName || "Unknown"),
    bloodGroup: String(patient?.basicInfo?.bloodGroup || "Unknown"),
    contactPhone: String(patient?.basicInfo?.contact?.phone || ""),
    contactEmail: String(patient?.basicInfo?.contact?.email || ""),
    city: String(patient?.basicInfo?.address?.city || ""),
    country: String(patient?.basicInfo?.address?.country || ""),
    allergiesText: (patient?.emergencyInfo?.criticalAllergies || []).join("\n"),
    conditionsText: (patient?.emergencyInfo?.criticalConditions || []).join("\n"),
    medicationsText: (patient?.emergencyInfo?.currentMedications || []).join("\n"),
    emergencyContactName: String(ec?.name || ""),
    emergencyContactRelation: String(ec?.relation || ""),
    emergencyContactPhone: String(ec?.phone || ""),
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

function getStatusBadgeVariant(
  status: string | undefined
): "default" | "secondary" | "destructive" | "outline" | "emergency" | "caution" | "safe" | "info" {
  switch (status) {
    case "critical": return "emergency";
    case "caution":  return "caution";
    case "normal":   return "safe";
    default:         return "secondary";
  }
}

// ─── Nav constants ────────────────────────────────────────────────────────────

const NAV_VIEWS: MedicView[] = ["scans", "analytics", "search", "casualty", "profile"];

const NAV_META: Record<MedicView, { label: string; shortLabel: string; icon: React.ReactNode; tabIcon: React.ReactNode }> = {
  scans:     { label: "Recent Scans",    shortLabel: "Scans",     icon: <Clock      className="h-4 w-4 shrink-0" />, tabIcon: <Clock      className="h-3.5 w-3.5 shrink-0" /> },
  analytics: { label: "Analytics",       shortLabel: "Analytics", icon: <BarChart3  className="h-4 w-4 shrink-0" />, tabIcon: <BarChart3  className="h-3.5 w-3.5 shrink-0" /> },
  search:    { label: "Patient Search",  shortLabel: "Search",    icon: <Search     className="h-4 w-4 shrink-0" />, tabIcon: <Search     className="h-3.5 w-3.5 shrink-0" /> },
  casualty:  { label: "Multi-Casualty", shortLabel: "Casualty",  icon: <Users      className="h-4 w-4 shrink-0" />, tabIcon: <Users      className="h-3.5 w-3.5 shrink-0" /> },
  profile:   { label: "My Profile",      shortLabel: "Profile",   icon: <Stethoscope className="h-4 w-4 shrink-0" />, tabIcon: <Stethoscope className="h-3.5 w-3.5 shrink-0" /> },
};

// ─── Analytics sub-component ──────────────────────────────────────────────────

function AnalyticsView({ scans }: { scans: ScanRecord[] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayCounts = new Array(7).fill(0);
  const now = new Date();

  scans.forEach((s) => {
    const d = new Date(s.created_at);
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 7) dayCounts[d.getDay()]++;
  });

  const maxCount = Math.max(...dayCounts, 1);
  const conditionCounts: Record<string, number> = {};
  scans.forEach((s) => {
    (s.chronic_conditions || []).forEach((c) => {
      conditionCounts[c] = (conditionCounts[c] || 0) + 1;
    });
  });
  const topConditions = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4">Scan Volume (7 Days)</h3>
        <div className="space-y-3">
          {days.map((day, i) => (
            <div key={day} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8 shrink-0">{day}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-500"
                  style={{ width: `${(dayCounts[i] / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-foreground w-5 text-right shrink-0">{dayCounts[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Conditions</h3>
        {topConditions.length > 0 ? (
          <div className="space-y-3">
            {topConditions.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="truncate max-w-[160px]">{name}</Badge>
                <span className="text-sm font-medium text-foreground shrink-0">{count} patients</span>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function MedicDashboard() {
  const { signOut, user } = useAuth();
  const { data: scans, isLoading: scansLoading } = useRecentScans();

  const [showScanner, setShowScanner]                 = useState(false);
  const [scannedPatient, setScannedPatient]           = useState<QRData | null>(null);
  const [activeView, setActiveView]                   = useState<MedicView>("scans");
  const [searchQuery, setSearchQuery]                 = useState("");
  const [visibleCount, setVisibleCount]               = useState(8);
  const [emrQuery, setEmrQuery]                       = useState("");
  const [searchingPatient, setSearchingPatient]       = useState(false);
  const [searchError, setSearchError]                 = useState<string | null>(null);
  const [patientDraft, setPatientDraft]               = useState<PatientEditDraft | null>(null);
  const [savingPatient, setSavingPatient]             = useState(false);
  const [medicProfileDraft, setMedicProfileDraft]     = useState<MedicProfileDraft | null>(null);
  const [loadingMedicProfile, setLoadingMedicProfile] = useState(false);
  const [savingMedicProfile, setSavingMedicProfile]   = useState(false);
  const [isMultiCasualtyMode, setIsMultiCasualtyMode] = useState(false);
  const [casualtyList, setCasualtyList]               = useState<CasualtyRecord[]>([]);
  const [selectedCasualtyIndex, setSelectedCasualtyIndex] = useState<number | null>(null);
  const [incidentAlert, setIncidentAlert]             = useState<{ message: string; severity: "warning" | "success" } | null>(null);

  const selectedCasualty = selectedCasualtyIndex !== null ? casualtyList[selectedCasualtyIndex] ?? null : null;

  // Load medic profile on mount
  useEffect(() => {
    if (!user?.id) return;
    setLoadingMedicProfile(true);
    apiRequest<{ data?: MedicRecordLite }>(`/api/medics/by-auth/${encodeURIComponent(user.id)}`)
      .then((res) => {
        const m = res?.data;
        setMedicProfileDraft({
          id: String(m?._id || ""),
          authId: String(m?.authId || user.id || ""),
          name: String(m?.name || ""),
          email: String(m?.email || user.email || ""),
          phone: String(m?.phone || ""),
          specialization: String(m?.specialization || ""),
          licenseNumber: String(m?.licenseNumber || ""),
          verified: Boolean(m?.verified),
          avatar_url: m?.avatar_url ?? null,
        });
      })
      .catch(() => {
        setMedicProfileDraft({
          id: null,
          authId: String(user.id || ""),
          name: "",
          email: String(user.email || ""),
          phone: "",
          specialization: "",
          licenseNumber: "",
          verified: false,
          avatar_url: null,
        });
      })
      .finally(() => setLoadingMedicProfile(false));
  }, [user?.id]);

  const updatePatientDraft = (field: keyof PatientEditDraft, value: string) =>
    setPatientDraft((prev) => (prev ? { ...prev, [field]: value } : prev));

  const updateMedicDraft = (field: keyof MedicProfileDraft, value: string | boolean) =>
    setMedicProfileDraft((prev) => (prev ? { ...prev, [field]: value } : prev));

  const findPatientByEmr = async () => {
    const query = normalizeHealthId(emrQuery);
    if (!query) return;
    setSearchingPatient(true);
    setSearchError(null);
    setPatientDraft(null);
    try {
      const res = await apiRequest<{ data?: PatientRecordLite }>(
        `/api/patients/by-health-id/${encodeURIComponent(query)}`
      );
      if (!res?.data) throw new Error("Patient not found.");
      setPatientDraft(toPatientEditDraft(res.data));
    } catch (error: unknown) {
      setSearchError(getErrorMessage(error, "Patient not found."));
    } finally {
      setSearchingPatient(false);
    }
  };

  const savePatientProfile = async () => {
    if (!patientDraft) return;
    setSavingPatient(true);
    try {
      const payload = {
        basicInfo: {
          fullName: patientDraft.fullName,
          bloodGroup: patientDraft.bloodGroup,
          contact: { phone: patientDraft.contactPhone, email: patientDraft.contactEmail },
          address: { city: patientDraft.city, country: patientDraft.country },
        },
        emergencyInfo: {
          primaryEmergencyContacts: patientDraft.emergencyContactName
            ? [{ name: patientDraft.emergencyContactName, relation: patientDraft.emergencyContactRelation, phone: patientDraft.emergencyContactPhone, isPrimary: true }]
            : [],
          criticalAllergies: splitLinesToArray(patientDraft.allergiesText),
          criticalConditions: splitLinesToArray(patientDraft.conditionsText),
          currentMedications: splitLinesToArray(patientDraft.medicationsText),
          preferredHospitalInEmergency: {
            name: patientDraft.preferredHospitalName || "",
            phone: patientDraft.preferredHospitalPhone || "",
          },
          criticalNotes: patientDraft.criticalNotes,
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
      const duplicateIndex = casualtyList.findIndex((e) => normalizeHealthId(e.id) === incomingId);
      if (duplicateIndex >= 0) {
        setSelectedCasualtyIndex(duplicateIndex);
        setIncidentAlert({ message: `${data.name || "Patient"} is already in the casualty list.`, severity: "warning" });
        return;
      }
      const newCasualty: CasualtyRecord = { ...data, id: incomingId, scannedAt: new Date().toISOString(), triage: computeTriage(data) };
      setCasualtyList((prev) => {
        const next = [...prev, newCasualty];
        setSelectedCasualtyIndex(next.length - 1);
        return next;
      });
      setIncidentAlert({ message: `${data.name || incomingId} added to triage.`, severity: "success" });
      setActiveView("casualty");
      return;
    }
    setScannedPatient(data);
  };

  const casualtyStats = useMemo(() => ({
    critical: casualtyList.filter((e) => e.triage === "critical").length,
    caution:  casualtyList.filter((e) => e.triage === "caution").length,
    normal:   casualtyList.filter((e) => e.triage === "normal").length,
  }), [casualtyList]);

  const sortedScans = [...(scans || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
  const scansToday    = (scans || []).filter((s) => new Date(s.created_at) >= today).length;
  const uniquePatients = new Set((scans || []).map((s) => s.patient_user_id)).size;
  const withAllergies  = (scans || []).filter((s) => s.allergies && s.allergies.length > 0).length;

  const stats = [
    { label: "Scans Today",     value: String(scansToday) },
    { label: "Total Scans",     value: String((scans || []).length) },
    { label: "Unique Patients", value: String(uniquePatients) },
    { label: "With Allergies",  value: String(withAllergies) },
  ];

  // ─── Reusable sidebar nav item ──────────────────────────────────────────────
  const SidebarNavItem = ({ view, onClick }: { view: MedicView; onClick?: () => void }) => (
    <button
      onClick={() => { setActiveView(view); onClick?.(); }}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-150 text-left
        ${activeView === view
          ? "bg-primary/10 text-primary border-l-[3px] border-primary pl-[9px]"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-l-[3px] border-transparent pl-[9px]"
        }
      `}
    >
      {NAV_META[view].icon}
      <span className="truncate">{NAV_META[view].label}</span>
    </button>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex overflow-hidden">

      {/* ── Desktop Sidebar (fixed width, never shrinks) ── */}
      <aside className="hidden lg:flex flex-col border-r border-border bg-card" style={{ width: "256px", minWidth: "256px", maxWidth: "256px" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground truncate">Medic Portal</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_VIEWS.map((view) => (
            <SidebarNavItem key={view} view={view} />
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-border space-y-1.5 shrink-0">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => setShowScanner(true)}
          >
            <ScanLine className="h-4 w-4 shrink-0" />
            <span className="truncate">Scan QR Code</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* ── Main content column ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="h-16 shrink-0 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6">
          {/* Mobile logo (hidden on lg where sidebar shows) */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">Medic Portal</span>
          </Link>

          {/* Desktop: page title */}
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            {NAV_META[activeView].icon}
            <span className="font-medium text-foreground">{NAV_META[activeView].label}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Inline search for scans on desktop */}
            {activeView === "scans" && (
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search patients..."
                  className="pl-9 h-8 w-52 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            {/* Scan button (desktop) */}
            <Button
              variant="default"
              size="sm"
              className="hidden md:flex gap-1.5"
              onClick={() => setShowScanner(true)}
            >
              <ScanLine className="h-4 w-4" />
              Scan QR
            </Button>

            {/* Avatar */}
            <div className="h-8 w-8 shrink-0">
              <AvatarUpload
                currentUrl={medicProfileDraft?.avatar_url}
                size="sm"
                key={medicProfileDraft?.authId || "medic-avatar"}
              />
            </div>

            {/* Desktop sign-out */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-8 w-8"
              onClick={() => void signOut()}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile hamburger */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Open menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                  <SheetHeader className="px-4 h-16 border-b border-border flex flex-row items-center space-y-0">
                    <SheetTitle className="flex items-center gap-2 text-sm font-bold">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
                        <Heart className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                      Medic Portal
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {NAV_VIEWS.map((view) => (
                      <SheetClose asChild key={view}>
                        <SidebarNavItem view={view} />
                      </SheetClose>
                    ))}
                  </nav>
                  <div className="p-3 border-t border-border space-y-1.5">
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-sm"
                        onClick={() => setShowScanner(true)}
                      >
                        <ScanLine className="h-4 w-4 shrink-0" />
                        Scan QR Code
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => void signOut()}
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Sign Out
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 pb-24 sm:pb-6 max-w-5xl mx-auto w-full">

            {/* Stats row */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-medical"
                >
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">{stat.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Desktop tab bar (only on sm+, redundant on lg where sidebar handles nav) */}
            <div className="hidden sm:flex lg:hidden items-center justify-between mb-5 gap-3">
              <div className="flex rounded-lg border border-border p-1 bg-muted/40 overflow-x-auto gap-0.5 flex-1 min-w-0">
                {NAV_VIEWS.map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      activeView === view
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                    }`}
                  >
                    {NAV_META[view].tabIcon}
                    {NAV_META[view].shortLabel}
                  </button>
                ))}
              </div>
              <Button variant="default" size="sm" onClick={() => setShowScanner(true)} className="shrink-0 gap-1.5">
                <ScanLine className="h-4 w-4" />
                Scan QR
              </Button>
            </div>

            {/* Mobile search (shown in scans view) */}
            {activeView === "scans" && (
              <div className="mb-4 md:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search patients..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Animated view content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >

                {/* ── Scans ── */}
                {activeView === "scans" && (
                  <div className="space-y-3">
                    {!searchQuery && filteredScans.length > LATEST_SCAN_LIMIT && (
                      <p className="text-xs text-muted-foreground">
                        Showing {Math.min(visibleCount, filteredScans.length)} of {filteredScans.length} scans
                      </p>
                    )}
                    {scansLoading ? (
                      <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : scansToDisplay.length === 0 ? (
                      <div className="card-medical text-center py-14">
                        <ScanLine className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? "No matching scans found" : "No scans yet — tap Scan QR to get started"}
                        </p>
                      </div>
                    ) : (
                      scansToDisplay.map((scan) => (
                        <div
                          key={scan.id}
                          className="card-medical hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => setScannedPatient({
                            v: 1,
                            id: scan.patient_health_id || "",
                            name: scan.patient_name || "",
                            dob: "", gender: "",
                            blood: scan.blood_type || "",
                            allergies: scan.allergies || [],
                            conditions: scan.chronic_conditions || [],
                            medications: [],
                            emergency: null,
                          })}
                        >
                          <div className="flex items-center justify-between gap-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 shrink-0 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate">{scan.patient_name}</div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {scan.patient_health_id || "No EMR"}
                                  </span>
                                  {scan.blood_type && (
                                    <>
                                      <span className="text-muted-foreground/40">·</span>
                                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                        <Droplets className="h-3 w-3" />{scan.blood_type}
                                      </span>
                                    </>
                                  )}
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />{safeDistanceFromNow(scan.created_at)}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                  <Badge variant={getStatusBadgeVariant(scan.scan_status)} className="text-[10px] uppercase">
                                    {scan.scan_status || "normal"}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {scan.scan_type || "Emergency"}
                                  </Badge>
                                  {typeof scan.response_time === "number" && scan.response_time > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {Math.round(scan.response_time)}s
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="hidden sm:flex flex-wrap gap-1 max-w-[180px] justify-end">
                                {(scan.chronic_conditions || []).slice(0, 2).map((c) => (
                                  <Badge key={c} variant="secondary" className="text-[10px] truncate max-w-[80px]">{c}</Badge>
                                ))}
                                {(scan.allergies || []).length > 0 && (
                                  <Badge variant="emergency" className="text-[10px]">
                                    {scan.allergies!.length} allerg{scan.allergies!.length > 1 ? "ies" : "y"}
                                  </Badge>
                                )}
                              </div>
                              {scan.notes && <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    {!searchQuery && filteredScans.length > scansToDisplay.length && (
                      <div className="pt-1 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVisibleCount((p) => p + LATEST_SCAN_LIMIT)}
                        >
                          Show more ({filteredScans.length - scansToDisplay.length} remaining)
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Analytics ── */}
                {activeView === "analytics" && <AnalyticsView scans={scans || []} />}

                {/* ── Search ── */}
                {activeView === "search" && (
                  <div className="space-y-4">
                    <div className="card-medical space-y-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Find Patient by EMR ID</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Search EMH-XXXXXX to view and update emergency profile fields.
                          </p>
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
                          {searchingPatient
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Search className="h-4 w-4" />}
                          Search
                        </Button>
                        {patientDraft?.healthId && (
                          <Button
                            variant="outline"
                            onClick={() => setScannedPatient({
                              v: 1,
                              id: patientDraft.healthId,
                              name: patientDraft.fullName,
                              dob: "", gender: "",
                              blood: patientDraft.bloodGroup,
                              allergies: splitLinesToArray(patientDraft.allergiesText),
                              conditions: splitLinesToArray(patientDraft.conditionsText),
                              medications: splitLinesToArray(patientDraft.medicationsText),
                              emergency: patientDraft.emergencyContactName
                                ? { name: patientDraft.emergencyContactName, phone: patientDraft.emergencyContactPhone, relation: patientDraft.emergencyContactRelation }
                                : null,
                            })}
                          >
                            Open Full Editor
                          </Button>
                        )}
                      </div>
                      {searchError && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" /> {searchError}
                        </div>
                      )}
                    </div>

                    {patientDraft && (
                      <div className="card-medical space-y-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{patientDraft.fullName}</h3>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {patientDraft.healthId} · {patientDraft.authId}
                            </p>
                          </div>
                          <Button onClick={() => void savePatientProfile()} disabled={savingPatient} size="sm">
                            {savingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Updates
                          </Button>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Basic Info</p>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                            {[
                              { label: "Blood Group", field: "bloodGroup" },
                              { label: "Contact Phone", field: "contactPhone" },
                              { label: "Contact Email", field: "contactEmail" },
                              { label: "City", field: "city" },
                              { label: "Country", field: "country" },
                            ].map(({ label, field }) => (
                              <div key={field} className="space-y-1">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <Input
                                  value={patientDraft[field as keyof PatientEditDraft] as string}
                                  onChange={(e) => updatePatientDraft(field as keyof PatientEditDraft, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hospital & Insurance</p>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                            {[
                              { label: "Preferred Hospital", field: "preferredHospitalName" },
                              { label: "Hospital Phone", field: "preferredHospitalPhone" },
                              { label: "Insurance Provider", field: "insuranceProvider" },
                              { label: "Policy Number", field: "insurancePolicyNumber" },
                            ].map(({ label, field }) => (
                              <div key={field} className="space-y-1">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <Input
                                  value={patientDraft[field as keyof PatientEditDraft] as string}
                                  onChange={(e) => updatePatientDraft(field as keyof PatientEditDraft, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emergency Contact</p>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                            {[
                              { label: "Name", field: "emergencyContactName" },
                              { label: "Relationship", field: "emergencyContactRelation" },
                              { label: "Phone", field: "emergencyContactPhone" },
                            ].map(({ label, field }) => (
                              <div key={field} className="space-y-1">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <Input
                                  value={patientDraft[field as keyof PatientEditDraft] as string}
                                  onChange={(e) => updatePatientDraft(field as keyof PatientEditDraft, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Medical Details</p>
                          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                            {[
                              { label: "Allergies (one per line or comma-separated)", field: "allergiesText" },
                              { label: "Conditions (one per line or comma-separated)", field: "conditionsText" },
                              { label: "Medications (one per line or comma-separated)", field: "medicationsText" },
                            ].map(({ label, field }) => (
                              <div key={field} className="space-y-1">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <Textarea
                                  value={patientDraft[field as keyof PatientEditDraft] as string}
                                  onChange={(e) => updatePatientDraft(field as keyof PatientEditDraft, e.target.value)}
                                  rows={4}
                                  className="text-sm resize-none"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Critical Notes</p>
                            <Textarea
                              value={patientDraft.criticalNotes}
                              onChange={(e) => updatePatientDraft("criticalNotes", e.target.value)}
                              rows={3}
                              className="text-sm resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Profile ── */}
                {activeView === "profile" && (
                  <div className="card-medical space-y-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Medic Profile</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Keep your clinician identity complete for auditing and emergency operations.
                        </p>
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
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                          {[
                            { label: "Full Name", field: "name" },
                            { label: "Email", field: "email" },
                            { label: "Phone", field: "phone" },
                            { label: "Specialization", field: "specialization" },
                            { label: "License Number", field: "licenseNumber" },
                            { label: "Auth ID (read-only)", field: "authId" },
                          ].map(({ label, field }) => (
                            <div key={field} className="space-y-1">
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <Input
                                value={medicProfileDraft[field as keyof MedicProfileDraft] as string}
                                onChange={(e) => updateMedicDraft(field as keyof MedicProfileDraft, e.target.value)}
                                className={`h-8 text-sm ${field === "authId" ? "font-mono bg-muted/50" : ""}`}
                                readOnly={field === "authId"}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button onClick={() => void saveMedicProfile()} disabled={savingMedicProfile} size="sm">
                            {savingMedicProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Profile
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Casualty ── */}
                {activeView === "casualty" && (
                  <div className="space-y-4">
                    {/* Control bar */}
                    <div className="card-medical space-y-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Multi-Casualty Triage</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Enable mode to queue multiple patients and prevent duplicate scans.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant={isMultiCasualtyMode ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => { setIsMultiCasualtyMode((p) => !p); if (isMultiCasualtyMode) setIncidentAlert(null); }}
                          >
                            <Users className="h-4 w-4" />
                            {isMultiCasualtyMode ? "Disable Mode" : "Enable Mode"}
                          </Button>
                          <Button size="sm" onClick={() => setShowScanner(true)}>
                            <ScanLine className="h-4 w-4" />
                            Scan Patient
                          </Button>
                        </div>
                      </div>

                      {/* Triage counts */}
                      <div className="grid gap-3 grid-cols-3">
                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Critical</p>
                          <p className="text-2xl font-bold text-destructive tabular-nums">{casualtyStats.critical}</p>
                        </div>
                        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Caution</p>
                          <p className="text-2xl font-bold text-yellow-600 tabular-nums">{casualtyStats.caution}</p>
                        </div>
                        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Normal</p>
                          <p className="text-2xl font-bold text-green-600 tabular-nums">{casualtyStats.normal}</p>
                        </div>
                      </div>

                      {/* Alert */}
                      <AnimatePresence>
                        {incidentAlert && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`rounded-lg p-3 text-xs flex items-center justify-between gap-2 ${
                              incidentAlert.severity === "warning"
                                ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                : "border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              {incidentAlert.message}
                            </span>
                            <button onClick={() => setIncidentAlert(null)} className="shrink-0 opacity-60 hover:opacity-100">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Queue + Detail split */}
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[280px_1fr]">
                      {/* Queue */}
                      <div className="card-medical space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground">Queue</h4>
                          <Badge variant="outline">{casualtyList.length}</Badge>
                        </div>
                        {casualtyList.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-6 text-center">No patients scanned yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-[400px] overflow-y-auto -mx-1 px-1">
                            {casualtyList.map((entry, index) => (
                              <button
                                key={`${entry.id}-${entry.scannedAt}`}
                                onClick={() => setSelectedCasualtyIndex(index)}
                                className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                                  selectedCasualtyIndex === index
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{entry.name || "Unknown"}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{entry.id}</p>
                                  </div>
                                  <Badge variant={getStatusBadgeVariant(entry.triage)} className="uppercase text-[10px] shrink-0">
                                    {entry.triage}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {safeDistanceFromNow(entry.scannedAt)}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => { setCasualtyList([]); setSelectedCasualtyIndex(null); setIncidentAlert(null); }}
                          disabled={casualtyList.length === 0}
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear Queue
                        </Button>
                      </div>

                      {/* Detail panel */}
                      <div className="card-medical min-h-[200px]">
                        {!selectedCasualty ? (
                          <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Select a patient from the queue</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">
                                  {selectedCasualty.name || "Unknown Patient"}
                                </h4>
                                <p className="text-xs text-muted-foreground font-mono">{selectedCasualty.id}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={getStatusBadgeVariant(selectedCasualty.triage)} className="uppercase text-[10px]">
                                  {selectedCasualty.triage}
                                </Badge>
                                <Button variant="outline" size="sm" onClick={() => setScannedPatient(selectedCasualty)}>
                                  Full Editor
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

                            <div className="grid gap-3 grid-cols-3">
                              {[
                                { label: "Blood Group", value: selectedCasualty.blood || "—" },
                                { label: "Allergies", value: String(selectedCasualty.allergies.length) },
                                { label: "Conditions", value: String(selectedCasualty.conditions.length) },
                              ].map(({ label, value }) => (
                                <div key={label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                                  <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-lg border border-border p-3">
                                <p className="text-xs text-muted-foreground mb-2 font-medium">Allergies</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedCasualty.allergies.length > 0
                                    ? selectedCasualty.allergies.map((item) => (
                                        <Badge key={item} variant="emergency" className="text-[10px]">{item}</Badge>
                                      ))
                                    : <p className="text-xs text-muted-foreground">None listed</p>}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border p-3">
                                <p className="text-xs text-muted-foreground mb-2 font-medium">Conditions</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedCasualty.conditions.length > 0
                                    ? selectedCasualty.conditions.map((item) => (
                                        <Badge key={item} variant="caution" className="text-[10px]">{item}</Badge>
                                      ))
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
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── PatientDataForm modal ── */}
      <AnimatePresence>
        {scannedPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-background rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative border border-border"
            >
              <button
                className="absolute top-3 right-3 z-10 rounded-full h-7 w-7 flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setScannedPatient(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <PatientDataForm qrData={scannedPatient} onBack={() => setScannedPatient(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom tab bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur border-t border-border flex justify-around py-1.5 shadow-lg">
        {NAV_VIEWS.map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              activeView === view ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`transition-transform ${activeView === view ? "scale-110" : ""}`}>
              {NAV_META[view].icon}
            </span>
            <span className="text-[10px] font-medium">{NAV_META[view].shortLabel}</span>
          </button>
        ))}
      </div>

      {/* ── QR Scanner ── */}
      {showScanner && (
        <QRScanner onScanResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}

      {/* ── Mobile FAB (only on small screens, hidden on sm+) ── */}
      <button
        onClick={() => setShowScanner(true)}
        className="fixed bottom-20 right-4 h-13 w-13 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-40 sm:hidden"
        style={{ height: "52px", width: "52px" }}
      >
        <ScanLine className="h-5 w-5" />
      </button>
    </div>
  );
}