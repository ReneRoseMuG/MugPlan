import { TagBadge } from "@/components/ui/tag-badge";
import type { Tag } from "@shared/schema";

interface EntityTagFooterRowProps {
  tags: Tag[];
  testId?: string;
}

export function EntityTagFooterRow({ tags, testId }: EntityTagFooterRowProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex w-full flex-wrap items-center gap-1" data-testid={testId}>
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size="sm"
          testId={testId ? `${testId}-tag-${tag.id}` : undefined}
        />
      ))}
    </div>
  );
}
