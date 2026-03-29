import { useState } from "react";
import { Phone, Mail, MapPin, UserPlus, Trash2, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmergencyContacts, getCurrentPatientRecord } from "@/hooks/usePatientData";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EmergencyContactsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: contacts, isLoading } = useEmergencyContacts();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", relationship: "", phone: "", email: "", address: "" });

  const getContactInitial = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.trim().charAt(0).toUpperCase() || "?";
  };

  const handleAdd = async () => {
    if (!user || !form.name || !form.phone) return;
    setSaving(true);
    let error: Error | null = null;
    try {
      const patient = await getCurrentPatientRecord(user.id);
      if (!patient?._id) {
        throw new Error("Patient profile not found");
      }

      await apiRequest("/api/emergency-contacts", {
        method: "POST",
        body: JSON.stringify({
          patient: patient._id,
          name: form.name,
          relationship: form.relationship || "Emergency Contact",
          phone: form.phone,
          email: form.email || undefined,
          address: form.address || undefined,
        }),
      });
    } catch (e: any) {
      error = e;
    }
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to add contact");
    } else {
      toast.success("Contact added");
      setForm({ name: "", relationship: "", phone: "", email: "", address: "" });
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/emergency-contacts/${id}`, { method: "DELETE" });
      toast.success("Contact removed");
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card-medical animate-pulse h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-medical">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Emergency Contacts
            </h3>
            <p className="text-xs text-muted-foreground mt-1">People to contact in case of an emergency</p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Contact Cards */}
      {contacts && contacts.length > 0 ? (
        contacts.map((contact) => (
          <div key={contact.id} className="card-medical">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {getContactInitial(contact.name)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {contact.name}
                    {contact.is_primary && (
                      <Badge variant="info" className="gap-1">
                        <Star className="h-2.5 w-2.5" /> Primary
                      </Badge>
                    )}
                  </div>
                  {contact.relationship && (
                    <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emergency" onClick={() => handleDelete(contact.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono">{contact.phone || "—"}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{contact.address}</span>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="card-medical text-center py-10">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No emergency contacts added yet.</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Add Your First Contact
          </Button>
        </div>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Sister" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254712345678" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Nairobi, Kenya" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.name || !form.phone}>
              {saving ? "Adding…" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
