import { useRef } from "react";
import type { ReactNode } from "react";
import { Paperclip } from "lucide-react";
import { SidebarChildPanel } from "@/components/ui/sidebar-child-panel";
import { AttachmentInfoBadge, type AttachmentBadgeItem } from "@/components/ui/attachment-info-badge";

type AttachmentSection = {
  id: string;
  title: string;
  subtitle?: string;
  items: AttachmentBadgeItem[];
  isLoading: boolean;
  emptyText: string;
  buildOpenUrl: (id: number) => string;
  buildDownloadUrl: (id: number) => string;
  canUpload?: boolean;
  isUploading?: boolean;
  onUpload?: (file: File) => void;
  footer?: ReactNode;
};

interface SplitAttachmentsPanelProps {
  title: string;
  helpKey?: string;
  sections: AttachmentSection[];
}

export function SplitAttachmentsPanel({ title, helpKey, sections }: SplitAttachmentsPanelProps) {
  const uploadableSection = sections.find((section) => section.canUpload && section.onUpload);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addAction = uploadableSection
    ? {
        onClick: () => fileInputRef.current?.click(),
        disabled: uploadableSection.isUploading === true,
        ariaLabel: "Dokument hinzufuegen",
        testId: "button-add-document-header",
      }
    : undefined;

  const totalCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <SidebarChildPanel
      title={`${title} (${totalCount})`}
      icon={<Paperclip className="w-4 h-4" />}
      helpKey={helpKey}
      addAction={addAction}
    >
      {uploadableSection ? (
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file || !uploadableSection.onUpload) return;
            uploadableSection.onUpload(file);
            event.currentTarget.value = "";
          }}
        />
      ) : null}

      <div className="space-y-4">
        {sections.map((section, index) => (
          <section key={section.id} className="space-y-2">
            {index > 0 ? <div className="border-t border-border/60" /> : null}
            <div className="pt-2">
              <p className="text-xs font-semibold tracking-wide text-primary">{section.title}</p>
              {section.subtitle ? <p className="text-xs text-muted-foreground">{section.subtitle}</p> : null}
            </div>

            {section.isLoading ? (
              <p className="text-sm text-slate-400 text-center py-2">Dokumente werden geladen...</p>
            ) : section.items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-2">{section.emptyText}</p>
            ) : (
              <div className="space-y-2">
                {section.items.map((attachment) => (
                  <AttachmentInfoBadge
                    key={`${section.id}-${attachment.id}`}
                    attachment={attachment}
                    openUrl={section.buildOpenUrl(attachment.id)}
                    downloadUrl={section.buildDownloadUrl(attachment.id)}
                    testId={`attachment-badge-${section.id}-${attachment.id}`}
                  />
                ))}
              </div>
            )}

            {section.footer}
          </section>
        ))}
      </div>
    </SidebarChildPanel>
  );
}
