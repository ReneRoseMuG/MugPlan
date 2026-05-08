import React from "react";
import {
  normalizeMeasuredPrintCardKey,
  type MeasuredPrintCardHeights,
} from "@/lib/measured-print-pages";

export type MeasuredPrintCardMeasurementResult = {
  pageCapacityPx: number;
  cardHeights: MeasuredPrintCardHeights;
};

type MeasuredPrintCardMeasurementProps<TItem> = {
  items: readonly TItem[];
  getItemKey: (item: TItem, index: number) => string | number;
  renderCard: (item: TItem, index: number) => React.ReactNode;
  renderMeasurementLayout: (args: {
    contentRef: React.Ref<HTMLDivElement>;
    cards: React.ReactNode;
  }) => React.ReactNode;
  onMeasured: (measurement: MeasuredPrintCardMeasurementResult) => void;
  testId?: string;
  measurementKey?: string | number;
  getCardWrapperClassName?: (item: TItem, index: number) => string | undefined;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function areMeasuredPrintCardMeasurementsEqual(
  left: MeasuredPrintCardMeasurementResult | null,
  right: MeasuredPrintCardMeasurementResult,
): boolean {
  if (!left || left.pageCapacityPx !== right.pageCapacityPx) {
    return false;
  }

  const leftEntries = Object.entries(left.cardHeights);
  const rightEntries = Object.entries(right.cardHeights);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return rightEntries.every(([key, value]) => left.cardHeights[key] === value);
}

export function MeasuredPrintCardMeasurement<TItem>({
  items,
  getItemKey,
  renderCard,
  renderMeasurementLayout,
  onMeasured,
  testId = "measured-print-card-measurement",
  measurementKey,
  getCardWrapperClassName,
}: MeasuredPrintCardMeasurementProps<TItem>) {
  const pageContentRef = React.useRef<HTMLDivElement | null>(null);
  const cardNodesRef = React.useRef(new Map<string, HTMLDivElement>());

  const registerCardNode = React.useCallback((key: string) => (node: HTMLDivElement | null) => {
    if (node) {
      cardNodesRef.current.set(key, node);
      return;
    }
    cardNodesRef.current.delete(key);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const pageContentNode = pageContentRef.current;
    if (!pageContentNode || items.length === 0) {
      return;
    }

    const cardHeights: MeasuredPrintCardHeights = {};
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]!;
      const key = normalizeMeasuredPrintCardKey(getItemKey(item, index));
      const node = cardNodesRef.current.get(key);
      if (!node) {
        return;
      }
      cardHeights[key] = Math.ceil(node.getBoundingClientRect().height);
    }

    onMeasured({
      pageCapacityPx: Math.floor(pageContentNode.getBoundingClientRect().height),
      cardHeights,
    });
  }, [getItemKey, items, measurementKey, onMeasured]);

  const cards = items.map((item, index) => {
    const key = normalizeMeasuredPrintCardKey(getItemKey(item, index));
    return (
      <div
        key={key}
        ref={registerCardNode(key)}
        className={getCardWrapperClassName?.(item, index)}
        data-print-card-measurement-key={key}
      >
        {renderCard(item, index)}
      </div>
    );
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[-10000px] top-0 opacity-0"
      data-testid={testId}
    >
      {renderMeasurementLayout({ contentRef: pageContentRef, cards })}
    </div>
  );
}
