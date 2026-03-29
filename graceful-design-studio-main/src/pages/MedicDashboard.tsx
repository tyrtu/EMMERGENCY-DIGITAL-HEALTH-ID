import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, ScanLine, Clock, BarChart3, User, LogOut,
  Droplets, Search, FileText, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import QRScanner, { type QRData } from "@/components/medic/QRScanner";
import PatientDataForm from "@/components/medic/PatientDataForm";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentScans, type ScanRecord } from "@/hooks/useMedicData";
import { formatDistanceToNow } from "date-fns";

export default function MedicDashboard() {
  const { signOut } = useAuth();
  const { data: scans, isLoading: scansLoading } = useRecentScans();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedPatient, setScannedPatient] = useState<QRData | null>(null);
  const [activeView, setActiveView] = useState<"scans" | "analytics">("scans");
  const [searchQuery, setSearchQuery] = useState("");

  const handleScanResult = (data: QRData) => {
    setShowScanner(false);
    setScannedPatient(data);
  };

  const filteredScans = (scans || []).filter((s) =>
    !searchQuery || s.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.patient_health_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats from real data
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

  // If viewing a patient form, show that instead
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
          <PatientDataForm
            qrData={scannedPatient}
            onBack={() => setScannedPatient(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Heart className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground">Medic Portal</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6">
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

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex rounded-lg border border-border p-1 bg-muted/50">
            <button
              onClick={() => setActiveView("scans")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === "scans"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Recent Scans
            </button>
            <button
              onClick={() => setActiveView("analytics")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeView === "analytics"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </button>
          </div>
          <div className="hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
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
              {scansLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredScans.length === 0 ? (
                <div className="card-medical text-center py-12">
                  <ScanLine className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No matching scans found" : "No scans yet — tap the scan button to get started"}
                  </p>
                </div>
              ) : (
                filteredScans.map((scan) => (
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
                            {scan.patient_health_id && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {scan.patient_health_id}
                              </span>
                            )}
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
                              {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                            </span>
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
                        {scan.notes && (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeView === "analytics" && (
            <AnalyticsView scans={scans || []} />
          )}
        </motion.div>
      </div>

      {showScanner && (
        <QRScanner onScanResult={handleScanResult} onClose={() => setShowScanner(false)} />
      )}

      <button
        onClick={() => setShowScanner(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-40"
      >
        <ScanLine className="h-6 w-6" />
      </button>
    </div>
  );
}

function AnalyticsView({ scans }: { scans: ScanRecord[] }) {
  // Compute daily counts for last 7 days
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

  // Condition counts
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
