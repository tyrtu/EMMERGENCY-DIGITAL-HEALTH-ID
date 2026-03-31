
import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Eye, EyeOff } from "lucide-react";

export interface VitalsAlertProps {
  vitals: {
    [key: string]: number | string | null;
  };
  analysis: string | null; // AI-generated advice/summary
  abnormal: boolean;
  loading?: boolean;
}

export const VitalsAlert: React.FC<VitalsAlertProps> = ({ vitals, analysis, abnormal, loading }) => {
  const [showAdvice, setShowAdvice] = useState(false);
  const Icon = abnormal ? ShieldAlert : CheckCircle2;
  const color = abnormal ? "#e11d48" : "#22c55e";

  // Helper to parse and format the AI advice into sections
  function renderAdvice(analysis: string | null) {
    if (!analysis) return <div className="text-xs text-muted-foreground mt-1">No advice available.</div>;
    // Try to split into sections by headings
    const sections = analysis.split(/\*\*[A-Z][^\n\*]+\*\*:?/g).filter(Boolean);
    const headings = Array.from(analysis.matchAll(/\*\*([A-Z][^\n\*]+)\*\*:?/g)).map(m => m[1]);
    return (
      <div className="space-y-3 mt-2">
        {sections.map((sec, i) => (
          <div key={i}>
            {headings[i] && (
              <div className="font-semibold text-sm text-primary mb-1 mt-2 flex items-center gap-1">
                {/* Info icon can be added here if imported */}
                {headings[i]}
              </div>
            )}
            <div className="text-xs text-foreground whitespace-pre-line">
              {/* Render each actionable advice as a list if possible */}
              {sec.trim().split(/\n\d+\. /g).length > 1 ? (
                <ol className="list-decimal ml-5">
                  {sec.trim().split(/\n\d+\. /g).filter(Boolean).map((item, idx) => (
                    <li key={idx} className="mb-1">{item.trim()}</li>
                  ))}
                </ol>
              ) : (
                <span>{sec.trim()}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Helper to render vitals with colored badges for abnormal values
  function renderVitals(vitals: { [key: string]: number | string | null }) {
    return (
      <div className="flex flex-wrap gap-2 mt-1 mb-2">
        {Object.entries(vitals).map(([k, v]) => {
          let badgeColor = "bg-muted/60 text-foreground";
          if (abnormal && (k.includes("systolic") || k.includes("diastolic"))) badgeColor = "bg-emergency/20 text-emergency border border-emergency/40";
          if (abnormal && k.includes("heart_rate")) badgeColor = "bg-caution/20 text-caution border border-caution/40";
          return (
            <span key={k} className={`px-2 py-0.5 rounded text-xs font-mono ${badgeColor}`}>{k}: {v ?? "-"}</span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`card-medical border-l-4 flex flex-col gap-2 mb-2 shadow-lg ${abnormal ? "bg-emergency/10" : "bg-safe/10"}`} style={{ borderColor: color }}>
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6" style={{ color }} />
        <div className="font-semibold text-base flex items-center gap-2">
          {abnormal ? "Abnormal Vitals Detected" : "Vitals Normal"}
          <span className="inline-flex items-center gap-1 font-bold" style={{ color }}>{abnormal ? "Warning" : "OK"}</span>
        </div>
        <button
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded bg-muted/30 hover:bg-muted/50 text-xs font-medium border border-muted/40 transition"
          onClick={() => setShowAdvice((v) => !v)}
        >
          {showAdvice ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showAdvice ? "Hide Advice" : "Show Advice"}
        </button>
      </div>
      {renderVitals(vitals)}
      {loading ? (
        <div className="text-xs text-muted-foreground mt-1">Analyzing your vitals...</div>
      ) : showAdvice && (
        <div className="rounded bg-muted/30 p-3 mt-1 border border-muted/40">
          {renderAdvice(analysis)}
        </div>
      )}
    </div>
  );
};
