import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, Home, FileText, QrCode, Settings, LogOut,
  User, ChevronRight, Pill, Stethoscope, Users, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientProfile } from "@/hooks/usePatientData";
import OverviewTab from "@/components/patient/OverviewTab";
import MedicalTab from "@/components/patient/MedicalTab";
import QRTab from "@/components/patient/QRTab";
import AvatarUpload from "@/components/patient/AvatarUpload";
import EditProfileModal from "@/components/patient/settings/EditProfileModal";
import ChangePasswordModal from "@/components/patient/settings/ChangePasswordModal";
import ExportDataModal from "@/components/patient/settings/ExportDataModal";
import MedicalVisitsTab from "@/components/patient/MedicalVisitsTab";
import MedicationsTab from "@/components/patient/MedicationsTab";
import EmergencyContactsTab from "@/components/patient/EmergencyContactsTab";

const sidebarItems = [
  { icon: Home, label: "Overview", value: "overview" },
  { icon: FileText, label: "Medical", value: "medical" },
  { icon: Stethoscope, label: "Visits", value: "visits" },
  { icon: Pill, label: "Medications", value: "medications" },
  { icon: Users, label: "Contacts", value: "contacts" },
  { icon: QrCode, label: "QR Card", value: "qr" },
  { icon: Settings, label: "Settings", value: "settings" },
];

function SettingsTab() {
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const settingsItems = [
    { label: "Edit Profile", onClick: () => setEditOpen(true) },
    { label: "Change Password", onClick: () => setPasswordOpen(true) },
    { label: "Export My Data", onClick: () => setExportOpen(true) },
  ];

  return (
    <div className="max-w-lg space-y-4">
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-foreground mb-4">Account Settings</h3>
        <div className="space-y-3">
          {settingsItems.map((item) => (
            <button key={item.label} onClick={item.onClick} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm text-foreground">
              {item.label}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
      <div className="card-medical">
        <h3 className="text-sm font-semibold text-emergency mb-2">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all associated data.</p>
        <Button variant="destructive" size="sm">Delete Account</Button>
      </div>
      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} />
      <ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
      <ExportDataModal open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { signOut } = useAuth();
  const { data: profile } = usePatientProfile();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">Emergency Health ID</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.value
                  ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-bold text-foreground">Patient Dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage your health identity</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-foreground">{profile?.full_name || "Patient"}</div>
              <div className="text-xs text-muted-foreground font-mono">{profile?.health_id || "—"}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        </header>

        {/* Mobile Tabs */}
        <div className="lg:hidden border-b border-border bg-card">
          <div className="flex overflow-x-auto px-4 gap-1">
            {sidebarItems.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`flex items-center gap-2 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === item.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-6 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "medical" && <MedicalTab />}
            {activeTab === "visits" && <MedicalVisitsTab />}
            {activeTab === "medications" && <MedicationsTab />}
            {activeTab === "contacts" && <EmergencyContactsTab />}
            {activeTab === "qr" && <QRTab />}
            {activeTab === "settings" && <SettingsTab />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
