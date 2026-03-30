import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, Home, FileText, QrCode, Settings, LogOut,
  ChevronRight, Pill, Stethoscope, Users, Activity, Menu
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

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
  const { signOut, user } = useAuth();
  const { data: profile } = usePatientProfile();

  const mobilePrimaryTabs = ["overview", "medical", "visits", "contacts", "qr"];

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
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-foreground">Patient Dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage your health identity</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] max-w-sm">
                  <SheetHeader>
                    <SheetTitle>Patient Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    {sidebarItems.map((item) => (
                      <SheetClose asChild key={`mobile-${item.value}`}>
                        <button
                          onClick={() => setActiveTab(item.value)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            activeTab === item.value
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      </SheetClose>
                    ))}
                    <SheetClose asChild>
                      <button
                        onClick={() => void signOut()}
                        className="w-full mt-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-foreground">{profile?.full_name || "Patient"}</div>
              <div className="text-xs text-muted-foreground font-mono">{profile?.health_id || "—"}</div>
            </div>
            <AvatarUpload
              currentUrl={profile?.avatar_url}
              size="sm"
              key={user?.id || "avatar"}
            />
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden border-t border-border bg-card fixed bottom-0 left-0 right-0 z-30">
          <div className="grid grid-cols-5">
            {sidebarItems
              .filter((item) => mobilePrimaryTabs.includes(item.value))
              .map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-all ${
                  activeTab === item.value
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 p-3 pb-28 sm:p-6 lg:pb-6 overflow-y-auto">
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
