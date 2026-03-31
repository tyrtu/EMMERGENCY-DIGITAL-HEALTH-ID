import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import React from "react";

export interface TriageDisplayProps {
  triageText: string | null;
  loading?: boolean;
}

function parseTriageSections(text: string | null) {
  if (!text) return null;
  // Simple parser for headings and bullet points
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

export const TriageDisplay: React.FC<TriageDisplayProps> = ({ triageText, loading }) => {
  const sections = parseTriageSections(triageText);
  const { level, color, icon: Icon } = getTriageLevel(triageText);
  return (
    <div className="card-medical border-l-4 flex items-start gap-4 mb-2" style={{ borderColor: color }}>
      <Icon className="h-6 w-6 mt-1" style={{ color }} />
      <div className="flex-1">
        <div className="font-semibold text-sm flex items-center gap-2">
          AI Triage Suggestion:
          <span className="inline-flex items-center gap-1 font-bold" style={{ color }}>{level}</span>
        </div>
        {loading ? (
          <div className="text-xs text-muted-foreground mt-1">Analyzing patient data...</div>
        ) : triageText ? (
          <div className="text-xs text-foreground mt-1 whitespace-pre-line">
            {sections?.map((section, i) => (
              <div key={i} className="mb-2">
                {section.heading && <div className="font-bold mb-1">{section.heading}</div>}
                {section.content.map((line, j) => (
                  <div key={j} className={/^(\d+\.|[-*])/.test(line) ? "ml-4 list-disc" : ""}>{line}</div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1">No triage data available.</div>
        )}
      </div>
    </div>
  );
};
