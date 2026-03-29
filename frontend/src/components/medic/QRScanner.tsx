import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";
import { ScanLine, X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Payload {
  v?: number;
  id?: string;
  n?: string;
  bg?: string;
  alg?: string[];
  e?: string;
  ec?: { name?: string; phone?: string; relation?: string };
  criticalConditions?: string[];
  med?: string[];
}

function parseQrPayload(decodedText: string): QRData | null {
  try {
    const parsed = JSON.parse(decodedText) as Payload;

    // Graceful QR format
    if (parsed?.v && parsed?.id) {
      return parsed as QRData;
    }

    // Backend compact payload format: { e: base64, i: 'emh', ... }
    if (parsed?.e) {
      const json = atob(parsed.e);
      const payload = JSON.parse(json) as Payload;
      return {
        v: 1,
        id: payload.id || "",
        name: payload.n || "",
        dob: "",
        gender: "",
        blood: payload.bg || "",
        allergies: payload.alg || [],
        conditions: payload.criticalConditions || [],
        medications: payload.med || [],
        emergency: payload.ec
          ? {
              name: payload.ec.name || "",
              phone: payload.ec.phone || "",
              relation: payload.ec.relation || "",
            }
          : null,
      };
    }
  } catch {
    return null;
  }

  return null;
}

interface QRData {
  v: number;
  id: string;
  name: string;
  dob: string;
  gender: string;
  blood: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergency: { name: string; phone: string; relation: string } | null;
}

interface QRScannerProps {
  onScanResult: (data: QRData) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanResult, onClose }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualId, setManualId] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (manualMode) return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const data = parseQrPayload(decodedText);
          if (data?.id) {
            scanner.stop().catch(() => {});
            onScanResult(data);
          }
        },
        () => {} // ignore scan failures
      )
      .catch(() => {
        setError("Camera access denied. Use manual entry instead.");
        setManualMode(true);
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [manualMode, onScanResult]);

  const handleManualSubmit = () => {
    const trimmed = manualId.trim();
    if (!trimmed) return;
    // Create a minimal QR data object from manual health ID
    onScanResult({
      v: 1,
      id: trimmed,
      name: "",
      dob: "",
      gender: "",
      blood: "",
      allergies: [],
      conditions: [],
      medications: [],
      emergency: null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="card-medical p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              {manualMode ? "Enter Health ID" : "Scan QR Code"}
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!manualMode ? (
            <>
              <div
                id="qr-reader"
                ref={containerRef}
                className="w-full rounded-xl overflow-hidden bg-muted mb-4"
                style={{ minHeight: 280 }}
              />
              {error && (
                <p className="text-sm text-destructive mb-3">{error}</p>
              )}
              <p className="text-xs text-muted-foreground text-center mb-4">
                Point camera at patient's Health ID QR code
              </p>
            </>
          ) : (
            <div className="space-y-4 mb-4">
              <p className="text-sm text-muted-foreground">
                Enter the patient's Health ID manually (e.g. EMH-123456)
              </p>
              <Input
                placeholder="EMH-123456"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                className="font-mono"
              />
              <Button className="w-full" onClick={handleManualSubmit} disabled={!manualId.trim()}>
                Look Up Patient
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                if (!manualMode) scannerRef.current?.stop().catch(() => {});
                setManualMode(!manualMode);
                setError(null);
              }}
            >
              {manualMode ? (
                <><ScanLine className="h-4 w-4" /> Use Camera</>
              ) : (
                <><Keyboard className="h-4 w-4" /> Manual Entry</>
              )}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export type { QRData };
