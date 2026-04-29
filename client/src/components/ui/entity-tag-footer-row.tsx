import React, { useRef } from "react";
import { useTagContainerWidth } from "@/hooks/useTagContainerWidth";
import { TagBadge } from "@/components/ui/tag-badge";
import type { Tag } from "@shared/schema";

interface EntityTagFooterRowProps {
  tags: Tag[];
  testId?: string;
}

export function EntityTagFooterRow({ tags, testId }: EntityTagFooterRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const level = useTagContainerWidth(containerRef, tags.length);

  return (
    <div ref={containerRef} className="flex min-h-6 w-full flex-nowrap items-center gap-0.5 overflow-hidden" data-testid={testId}>
      {tags.length === 0 ? (
        <span className="text-[9px] font-medium text-slate-400">Keine Tags</span>
      ) : tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size="sm"
          level={level}
          testId={testId ? `${testId}-tag-${tag.id}` : undefined}
        />
      ))}
    </div>
  );
}
