import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientProfile } from "@/hooks/usePatientData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import AvatarUpload from "../AvatarUpload";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { data: profile } = usePatientProfile();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [dob, setDob] = useState(profile?.date_of_birth || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  // Sync state when profile loads
  const [synced, setSynced] = useState(false);
  if (profile && !synced) {
    setFullName(profile.full_name || "");
    setDob(profile.date_of_birth || "");
    setGender(profile.gender || "");
    setPhone(profile.phone || "");
    setSynced(true);
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          date_of_birth: dob || null,
          gender: gender || null,
          phone: phone || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      toast.success("Profile updated!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center">
            <AvatarUpload currentUrl={(profile as any)?.avatar_url} size="lg" />
          </div>
          <div>
            <Label className="text-sm">Full Name</Label>
            <Input className="mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <Label className="text-sm">Date of Birth</Label>
            <Input className="mt-1.5" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Phone</Label>
            <Input className="mt-1.5" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving</> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
