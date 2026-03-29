import { useState } from "react";
import { FileText, Send, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useScanNotes, addScanNote } from "@/hooks/useMedicData";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ScanNotesPanelProps {
  scanId: string;
}

export default function ScanNotesPanel({ scanId }: ScanNotesPanelProps) {
  const { user } = useAuth();
  const { data: notes, isLoading } = useScanNotes(scanId);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    try {
      await addScanNote(scanId, user.id, content.trim());
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["scan-notes", scanId] });
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-medical space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" /> Notes
      </h3>

      {/* Existing notes */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center gap-1 mt-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">No notes yet</p>
      )}

      {/* Add note */}
      <div className="space-y-2">
        <Textarea
          placeholder="Add a clinical note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="resize-none text-sm"
        />
        <Button
          size="sm"
          className="gap-2"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Add Note
        </Button>
      </div>
    </div>
  );
}
