import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { TagWidthLevel } from "@/lib/tag-utils";

const WIDE_MIN_WIDTH_PX = 200;
const MEDIUM_MIN_WIDTH_PX = 120;
const NARROW_MIN_WIDTH_PX = 80;
const ADDITIONAL_TAG_WIDTH_PENALTY_PX = 36;

export function resolveTagContainerWidthLevel(width: number, tagCount = 1): TagWidthLevel {
  const normalizedTagCount = Math.max(1, Math.min(tagCount, 4));
  const widthPenaltyPx = (normalizedTagCount - 1) * ADDITIONAL_TAG_WIDTH_PENALTY_PX;
  const effectiveWidth = width - widthPenaltyPx;

  if (effectiveWidth >= WIDE_MIN_WIDTH_PX) return 0;
  if (effectiveWidth >= MEDIUM_MIN_WIDTH_PX) return 1;
  if (effectiveWidth >= NARROW_MIN_WIDTH_PX) return 2;
  return 3;
}

export function useTagContainerWidth(
  ref: RefObject<HTMLElement | null>,
  tagCount = 1,
): TagWidthLevel {
  const [level, setLevel] = useState<TagWidthLevel>(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") {
      setLevel(0);
      return;
    }

    const updateLevel = (width: number) => {
      setLevel(resolveTagContainerWidthLevel(width, tagCount));
    };

    updateLevel(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateLevel(entry.contentRect.width);
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setLevel(resolveTagContainerWidthLevel(element.getBoundingClientRect().width, tagCount));
  }, [ref, tagCount]);

  return level;
}
