import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import {
  AttachmentInfoBadge,
  type AttachmentBadgeItem,
} from "@/components/ui/attachment-info-badge";

interface AttachmentsPanelProps {
  title: string;
  items: AttachmentBadgeItem[];
  isLoading: boolean;
  canUpload: boolean;
  isUploading: boolean;
  onUpload: (file: File) => void;
  buildOpenUrl: (id: number) => string;
  buildDownloadUrl: (id: number) => string;
}

export function AttachmentsPanel({
  title,
  items,
  isLoading,
  canUpload,
  isUploading,
  onUpload,
  buildOpenUrl,
  buildDownloadUrl,
}: AttachmentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addAction = canUpload
    ? {
        onClick: () => fileInputRef.current?.click(),
        disabled: isUploading,
        ariaLabel: "Dokument hinzufügen",
        testId: "button-add-document-header",
      }
    : undefined;

  return (
    <SidebarChildPanel
      title={`${title} (${items.length})`}
      icon={<Paperclip className="w-4 h-4" />}
      addAction={addAction}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          onUpload(file);
          event.currentTarget.value = "";
        }}
      />
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-2">Dokumente werden geladen...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-2">Keine Dokumente</p>
      ) : (
        <div className="space-y-2">
          {items.map((attachment) => (
            <AttachmentInfoBadge
              key={attachment.id}
              attachment={attachment}
              openUrl={buildOpenUrl(attachment.id)}
              downloadUrl={buildDownloadUrl(attachment.id)}
              testId={`attachment-badge-${attachment.id}`}
            />
          ))}
        </div>
      )}
    </SidebarChildPanel>
  );
}
