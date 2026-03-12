import type { InfoBadgePreview } from "@/components/ui/info-badge";

type TagBadgePreviewProps = {
  name: string;
};

export function TagBadgePreview({ name }: TagBadgePreviewProps) {
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-800">
      {name}
    </div>
  );
}

export function createTagBadgePreview(name: string): InfoBadgePreview {
  return {
    content: <TagBadgePreview name={name} />,
    options: {
      openDelayMs: 380,
      side: "right",
      align: "start",
      maxWidth: 240,
      maxHeight: null,
      scrollY: "visible",
    },
  };
}
