import React from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

export interface PatientTriageDisplayProps {
  triageText: string | null;
  loading?: boolean;
}

function parseTriageSections(text: string | null) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).filter(Boolean);
  const sections: { heading?: string; content: string[] }[] = [];
  let current: { heading?: string; content: string[] } = { content: [] };
  lines.forEach(line => {
    if (/^\*\*.*\*\*$/.test(line)) {
      if (current.content.length) sections.push(current);
      current = { heading: line.replace(/\*\*/g, "").trim(), content: [] };
    } else if (/^\d+\./.test(line) || /^[-*]/.test(line)) {
      current.content.push(line);
    } else if (line.trim()) {
      current.content.push(line);
    }
  });
  if (current.content.length || current.heading) sections.push(current);
  return sections;
}

function getTriageLevel(text: string | null) {
  if (!text) return { level: "Unknown", color: "gray", icon: Info };
  if (/critical/i.test(text)) return { level: "Critical", color: "#e11d48", icon: ShieldAlert };
  if (/caution/i.test(text)) return { level: "Caution", color: "#f59e42", icon: AlertTriangle };
  if (/normal|stable|no critical/i.test(text)) return { level: "Normal", color: "#22c55e", icon: CheckCircle2 };
  return { level: "Unknown", color: "gray", icon: Info };
}


// Simple post-processor to rewrite clinical triage advice for patients
function patientFriendlyTriage(text: string | null): string | null {
  if (!text) return null;
  // Remove headings like "Triage Level:", "Short Explanation:", "Actionable Recommendations:"
  let result = text
    .replace(/Triage Level:[^\n]*\n?/gi, "")
    .replace(/\*\*Short Explanation:\*\*/gi, "Here's what you should know:")
    .replace(/\*\*Actionable Recommendations:\*\*/gi, "What you can do:")
    .replace(/\*\*.*\*\*/g, ""); // Remove any other bold headings
  // Rephrase numbered/bulleted lists to be more direct
  result = result.replace(/\d+\. /g, "- ");
  // Remove "Patient has" or "Patient" at start of sentences
  result = result.replace(/Patient has /gi, "You have ");
  result = result.replace(/Patient /gi, "You ");
  // Remove "Current medications" and rephrase
  result = result.replace(/Current medications \(([^)]*)\)/gi, "You are currently taking $1");
  // Remove "Consider consulting with a medical professional..." and rephrase
  result = result.replace(/Consider consulting with a medical professional[^.]*\./gi, "If you have any concerns, please contact your doctor.");
  // Remove double newlines
  result = result.replace(/\n{2,}/g, "\n");
  return result.trim();
}

export const PatientTriageDisplay: React.FC<PatientTriageDisplayProps> = ({ triageText, loading }) => {
  const friendlyText = patientFriendlyTriage(triageText);
  const { level, color, icon: Icon } = getTriageLevel(triageText);
  return (
    <div className="card-medical border-l-4 flex items-start gap-4 mb-2" style={{ borderColor: color }}>
      <Icon className="h-6 w-6 mt-1" style={{ color }} />
      <div className="flex-1">
        <div className="font-semibold text-sm flex items-center gap-2">
          Your Health Status:
          <span className="inline-flex items-center gap-1 font-bold" style={{ color }}>{level}</span>
        </div>
        {loading ? (
          <div className="text-xs text-muted-foreground mt-1">Analyzing your health data...</div>
        ) : friendlyText ? (
          <div className="text-xs text-foreground mt-1 whitespace-pre-line">{friendlyText}</div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1">No triage data available.</div>
        )}
      </div>
    </div>
  );
};
