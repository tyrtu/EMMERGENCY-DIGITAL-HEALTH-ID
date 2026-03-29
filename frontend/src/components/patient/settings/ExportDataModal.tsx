import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePatientProfile, usePatientMedicalData } from "@/hooks/usePatientData";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportDataModal({ open, onOpenChange }: Props) {
  const { data: profile } = usePatientProfile();
  const { data: medical } = usePatientMedicalData();
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    try {
      const exportData = {
        exported_at: new Date().toISOString(),
        profile: {
          full_name: profile?.full_name,
          date_of_birth: profile?.date_of_birth,
          gender: profile?.gender,
          phone: profile?.phone,
          health_id: profile?.health_id,
        },
        medical_data: {
          blood_type: medical?.blood_type,
          allergies: medical?.allergies,
          chronic_conditions: medical?.chronic_conditions,
          current_medications: medical?.current_medications,
          emergency_contact: {
            name: medical?.emergency_contact_name,
            phone: medical?.emergency_contact_phone,
            relation: medical?.emergency_contact_relation,
          },
          insurance: {
            provider: medical?.insurance_provider,
            policy_number: medical?.insurance_policy_number,
          },
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `health-data-${profile?.health_id || "export"}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export My Data</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Download a JSON file containing all your profile and medical information.
          </p>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground">Included data:</p>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              <li>• Profile information</li>
              <li>• Medical records</li>
              <li>• Emergency contacts</li>
              <li>• Insurance details</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download JSON
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
