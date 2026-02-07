import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InfoBadgePreview } from "@/components/ui/info-badge";

type AttachmentInfoBadgePreviewProps = {
  originalName: string;
  mimeType?: string | null;
  openUrl: string;
  downloadUrl: string;
};

export const attachmentInfoBadgePreviewOptions = {
  openDelayMs: 380,
  side: "right" as const,
  align: "start" as const,
  maxWidth: 760,
  maxHeight: 600,
};

function resolveAbsoluteUrl(value: string): string {
  if (typeof window === "undefined") return value;
  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

function isTxtLikeFile(mimeType: string, lowerName: string) {
  return mimeType === "text/plain" || lowerName.endsWith(".txt");
}

export function AttachmentInfoBadgePreview({
  originalName,
  mimeType,
  openUrl,
  downloadUrl,
}: AttachmentInfoBadgePreviewProps) {
  const resolvedMimeType = mimeType ?? "";
  const lowerName = originalName.toLowerCase();
  const isPdf = resolvedMimeType === "application/pdf" || lowerName.endsWith(".pdf");
  const isImage = resolvedMimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(lowerName);
  const isWord = resolvedMimeType.includes("word") || /\.(doc|docx)$/i.test(lowerName);
  const isTxt = isTxtLikeFile(resolvedMimeType, lowerName);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);

  const officeEmbedUrl = useMemo(() => {
    if (!isWord) return null;
    const absoluteUrl = resolveAbsoluteUrl(openUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
  }, [isWord, openUrl]);

  useEffect(() => {
    if (!isTxt) return;

    const controller = new AbortController();
    setIsLoadingText(true);
    setTextError(null);
    setTextContent(null);

    fetch(openUrl, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        setTextContent(text);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Textvorschau konnte nicht geladen werden.";
        setTextError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingText(false);
        }
      });

    return () => controller.abort();
  }, [isTxt, openUrl]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">{originalName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={openUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" />
              Öffnen
            </a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={downloadUrl} target="_blank" rel="noreferrer" download>
              Download
            </a>
          </Button>
        </div>
      </div>

      <div className="max-h-[460px] overflow-auto rounded-md border border-border bg-background p-2">
        {isPdf ? (
          <iframe
            title={`Vorschau ${originalName}`}
            src={openUrl}
            className="h-[440px] w-full border-0"
          />
        ) : isImage ? (
          <img
            src={openUrl}
            alt={originalName}
            className="h-auto max-w-full"
          />
        ) : isWord && officeEmbedUrl ? (
          <iframe
            title={`Word-Vorschau ${originalName}`}
            src={officeEmbedUrl}
            className="h-[440px] w-full border-0"
          />
        ) : isTxt ? (
          <div className="text-sm text-muted-foreground">
            {isLoadingText && <p>Textvorschau wird geladen...</p>}
            {textError && <p>Textvorschau nicht verfügbar: {textError}</p>}
            {textContent && (
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                {textContent}
              </pre>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Keine Inline-Vorschau verfügbar.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function createAttachmentInfoBadgePreview(
  props: AttachmentInfoBadgePreviewProps,
): InfoBadgePreview {
  return {
    content: <AttachmentInfoBadgePreview {...props} />,
    options: attachmentInfoBadgePreviewOptions,
  };
}
