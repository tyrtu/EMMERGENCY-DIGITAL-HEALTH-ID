import { useState } from "react";
import { Download, Share2, Shield, CreditCard, Eye, RefreshCw, QrCode, AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePatientProfile, usePatientMedicalData, useQrDisplayData } from "@/hooks/usePatientData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { apiRequest } from "@/lib/apiClient";

export default function QRTab() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = usePatientProfile();
  const { data: medical, isLoading: medicalLoading } = usePatientMedicalData();
  const { data: qrData, isLoading: qrDataLoading, refetch: refetchQrData } = useQrDisplayData();
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const isLoading = profileLoading || medicalLoading || qrDataLoading;

  const fetchQrImage = async (): Promise<Blob | null> => {
    if (!user?.id) {
      toast.error("Please sign in to download your health card");
      return null;
    }

    const response = await apiRequest<Response>(`/api/qr/${user.id}`, {
      method: "GET",
      rawResponse: true,
    });

    if (!response.ok) {
      throw new Error("Failed to generate QR image");
    }

    return await response.blob();
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const blob = await fetchQrImage();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCardPreview(url);
    } catch {
      toast.error("Failed to generate QR preview");
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownloadPNG = async () => {
    setDownloadingQr(true);
    try {
      const blob = await fetchQrImage();
      if (!blob) return;

      const link = document.createElement("a");
      link.download = `${profile?.health_id || "medical-qr"}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Medical QR image downloaded!");
    } catch {
      toast.error("Failed to download QR image");
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!user?.id) {
      toast.error("Please sign in to download your health card PDF");
      return;
    }
    setDownloadingPdf(true);
    try {
      const response = await apiRequest<Response>(`/api/qr/card-pdf/${user.id}`, {
        method: "GET",
        rawResponse: true,
      });

      if (!response.ok) {
        throw new Error("Failed to generate Health ID PDF");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.download = `${profile?.health_id || "health-id-card"}.pdf`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Health ID card PDF downloaded!");
    } catch {
      toast.error("Failed to download Health ID card PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchQrData(), handlePreview()]);
    toast.success("QR information refreshed");
  };

  const handleShare = async () => {
    if (navigator.share && profile?.health_id) {
      await navigator.share({
        title: "Emergency Health ID",
        text: `Emergency Health ID: ${profile.health_id}`,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card-medical text-center p-8">
          <div className="animate-pulse space-y-4">
            <div className="mx-auto w-full max-w-lg h-64 bg-muted rounded-xl" />
            <div className="h-4 bg-muted rounded w-48 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Emergency Digital Health ID Card
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Download your official medical ID card for emergency situations
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {profile?.health_id || "—"}
        </Badge>
      </div>

      {/* Card Preview */}
      <div className="card-medical p-4 sm:p-6 max-w-full w-full">
        {cardPreview ? (
          <div className="w-full flex justify-center items-center py-6">
            <img
              src={cardPreview}
              alt="Medical QR Code"
              style={{ width: 320, height: 320, maxWidth: "90vw", maxHeight: "90vw", objectFit: "contain", background: "#fff", padding: 16, borderRadius: 16, boxShadow: "0 2px 12px 0 rgba(0,0,0,0.04)" }}
            />
          </div>
        ) : (
          <div
            className="w-full rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 bg-muted/30"
            style={{ aspectRatio: "1012 / 638" }}
          >
            <CreditCard className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Click preview to generate your medical QR code</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2">
          <Shield className="h-3.5 w-3.5 text-safe" />
          <span className="text-xs text-muted-foreground">
            Generated from backend QR endpoint · Contains emergency data
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          className="gap-2"
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
        >
          <Download className="h-4 w-4" />
          {downloadingPdf ? "Generating PDF..." : "Download Health ID Card PDF"}
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handlePreview}
          disabled={previewing}
        >
          <Eye className="h-4 w-4" />
          {previewing ? "Generating..." : cardPreview ? "Refresh Preview" : "Medical QR Code"}
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleDownloadPNG}
          disabled={downloadingQr}
        >
          <Download className="h-4 w-4" />
          {downloadingQr ? "Downloading..." : "Download QR Image"}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleShare}
          disabled={!profile?.health_id}
        >
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>

      {/* QR Code Information */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" /> QR Code Information
        </h3>
        <div className="space-y-2 text-xs">
          {[
            { label: "Patient", value: qrData?.basicInfo?.fullName || profile?.full_name },
            { label: "Blood Group", value: qrData?.basicInfo?.bloodGroup || medical?.blood_type },
            { label: "Age", value: qrData?.basicInfo?.age != null ? String(qrData.basicInfo.age) : profile?.age },
            { label: "Phone", value: qrData?.basicInfo?.contact?.phone || profile?.phone },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value || "Not set"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Information */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-emergency" /> Emergency Information
        </h3>
        <div className="space-y-4 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">Critical Allergies</div>
            <div className="flex flex-wrap gap-2">
              {(qrData?.emergencyInfo?.criticalAllergies || []).length > 0
                ? (qrData?.emergencyInfo?.criticalAllergies || []).map((item) => (
                    <Badge key={item} variant="emergency">{item}</Badge>
                  ))
                : <span className="text-foreground">None recorded</span>}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Current Medications</div>
            <div className="flex flex-wrap gap-2">
              {(qrData?.emergencyInfo?.currentMedications || []).length > 0
                ? (qrData?.emergencyInfo?.currentMedications || []).map((item) => (
                    <Badge key={item} variant="info">{item}</Badge>
                  ))
                : <span className="text-foreground">None recorded</span>}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Medical Conditions</div>
            <div className="flex flex-wrap gap-2">
              {(qrData?.emergencyInfo?.criticalConditions || []).length > 0
                ? (qrData?.emergencyInfo?.criticalConditions || []).map((item) => (
                    <Badge key={item} variant="caution">{item}</Badge>
                  ))
                : <span className="text-foreground">None recorded</span>}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Important Notes</div>
            <div className="text-foreground">{qrData?.emergencyInfo?.criticalNotes || "No critical notes"}</div>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" /> Emergency Contacts
        </h3>
        <div className="space-y-3">
          {(qrData?.emergencyInfo?.primaryEmergencyContacts || []).length > 0 ? (
            (qrData?.emergencyInfo?.primaryEmergencyContacts || []).map((contact, idx) => (
              <div key={`${contact.name || "contact"}-${idx}`} className="rounded-lg bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {contact.name || "Emergency Contact"}
                  {contact.isPrimary && <Badge variant="safe">Primary</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{contact.relation || "Contact"}</div>
                <div className="mt-1 text-xs text-foreground">{contact.phone || "No phone"}</div>
                {contact.email && <div className="text-xs text-foreground">{contact.email}</div>}
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No emergency contacts recorded</p>
          )}
        </div>
      </div>

      {/* QR Metadata */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">QR Metadata</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border">
            <span className="text-muted-foreground">QR Code ID</span>
            <span className="font-medium text-foreground">{qrData?.qrMetadata?.qrCodeId || "Not set"}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border">
            <span className="text-muted-foreground">Issued</span>
            <span className="font-medium text-foreground">
              {qrData?.qrMetadata?.issuedAt ? new Date(qrData.qrMetadata.issuedAt).toLocaleDateString() : "Not set"}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-muted-foreground">Health ID</span>
            <span className="font-medium text-foreground">{profile?.health_id || "Not set"}</span>
          </div>
        </div>
      </div>

      {/* How To Use */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">How to Use Your Medical QR Code</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
          <li>Save to your phone photos for quick access.</li>
          <li>Print and keep in your wallet or car.</li>
          <li>Share with family members and caregivers.</li>
          <li>Show to medical staff during emergencies.</li>
          <li>Refresh whenever medical information changes.</li>
        </ul>
      </div>

      {/* Data Summary */}
      <div className="card-medical max-w-full w-full">
        <h3 className="text-sm font-semibold text-foreground mb-3">Card Data Summary</h3>
        <div className="space-y-2 text-xs">
          {[
            { label: "Name", value: profile?.full_name },
            { label: "Health ID", value: profile?.health_id },
            { label: "Blood Type", value: medical?.blood_type },
            { label: "Allergies", value: medical?.allergies?.join(", ") },
            { label: "Conditions", value: medical?.chronic_conditions?.join(", ") },
            { label: "Medications", value: medical?.current_medications?.join(", ") },
            { label: "Emergency Contact", value: medical?.emergency_contact_name },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value || "Not set"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
