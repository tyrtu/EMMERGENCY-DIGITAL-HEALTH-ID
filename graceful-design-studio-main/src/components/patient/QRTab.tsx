import { useState } from "react";
import { Download, Share2, Shield, CreditCard, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePatientProfile, usePatientMedicalData } from "@/hooks/usePatientData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function QRTab() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = usePatientProfile();
  const { data: medical, isLoading: medicalLoading } = usePatientMedicalData();
  const [downloading, setDownloading] = useState(false);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const isLoading = profileLoading || medicalLoading;

  const fetchCard = async (): Promise<Blob | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to download your health card");
      return null;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/generate-health-card`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to generate card");
    }

    return await res.blob();
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const blob = await fetchCard();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCardPreview(url);
    } catch {
      toast.error("Failed to generate card preview");
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownloadPNG = async () => {
    setDownloading(true);
    try {
      const blob = await fetchCard();
      if (!blob) return;

      // Convert SVG to PNG at fixed resolution
      const svgUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1012;
        canvas.height = 638;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 1012, 638);
        URL.revokeObjectURL(svgUrl);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const link = document.createElement("a");
          link.download = `${profile?.health_id || "health-card"}.png`;
          link.href = URL.createObjectURL(pngBlob);
          link.click();
          URL.revokeObjectURL(link.href);
          setDownloading(false);
          toast.success("Health card downloaded!");
        }, "image/png");
      };
      img.onerror = () => {
        setDownloading(false);
        toast.error("Failed to render card");
      };
      img.src = svgUrl;
    } catch {
      toast.error("Failed to download card");
      setDownloading(false);
    }
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Health ID Card
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Your digital emergency identity card — consistent size on any device
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {profile?.health_id || "—"}
        </Badge>
      </div>

      {/* Card Preview */}
      <div className="card-medical p-6">
        {cardPreview ? (
          <div className="w-full overflow-hidden rounded-xl border border-border">
            <img
              src={cardPreview}
              alt="Health ID Card"
              className="w-full h-auto"
              style={{ aspectRatio: "1012 / 638" }}
            />
          </div>
        ) : (
          <div
            className="w-full rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 bg-muted/30"
            style={{ aspectRatio: "1012 / 638" }}
          >
            <CreditCard className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Click preview to generate your ID card</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2">
          <Shield className="h-3.5 w-3.5 text-safe" />
          <span className="text-xs text-muted-foreground">
            Generated server-side · Fixed 1012×638px · Contains emergency data
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handlePreview}
          disabled={previewing}
        >
          <Eye className="h-4 w-4" />
          {previewing ? "Generating..." : cardPreview ? "Refresh Preview" : "Preview Card"}
        </Button>
        <Button
          className="gap-2"
          onClick={handleDownloadPNG}
          disabled={downloading}
        >
          <Download className="h-4 w-4" />
          {downloading ? "Downloading..." : "Download PNG"}
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

      {/* Data Summary */}
      <div className="card-medical">
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
