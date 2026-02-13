import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentExtractionDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function DocumentExtractionDropzone({
  onFileSelected,
  disabled = false,
  isProcessing = false,
}: DocumentExtractionDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | null | undefined) => {
    if (!file || disabled || isProcessing) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) return;
    onFileSelected(file);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Dokumentenextraktion (PDF)</h3>
      <div
        className={`rounded-lg border-2 border-dashed p-5 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !isProcessing) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        data-testid="dropzone-document-extraction"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <FileUp className="w-4 h-4" />
            <span>PDF hier ablegen oder auswählen</span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isProcessing}
            data-testid="button-select-document-extraction"
          >
            {isProcessing ? "Extraktion läuft..." : "PDF auswählen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
