import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

const VIEWPORT_PADDING = 8;
const DRAG_THRESHOLD = 4;
type DragPhase = "intent" | "dragging" | "pinned";

export type KeeperEntry = {
  id: string;
  pos: { x: number; y: number };
  intentStart: { x: number; y: number };
  popoverMaxWidth: number;
  popoverMaxHeight: number;
  isImageContent: boolean;
  renderContent: (
    onClose: () => void,
    onDragHandleMouseDown: (e: ReactMouseEvent) => void,
  ) => ReactNode;
};

type FloatingPreviewKeeperContextValue = {
  register: (entry: KeeperEntry) => void;
  unregister: (id: string) => void;
};

const FloatingPreviewKeeperContext =
  createContext<FloatingPreviewKeeperContextValue | null>(null);

export function useFloatingPreviewKeeper(): FloatingPreviewKeeperContextValue | null {
  return useContext(FloatingPreviewKeeperContext);
}

function KeeperPreview({
  entry,
  onRemove,
}: {
  entry: KeeperEntry;
  onRemove: () => void;
}) {
  const [dragPhase, setDragPhase] = useState<DragPhase>("intent");
  const [pos, setPos] = useState(entry.pos);
  const posRef = useRef(entry.pos);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const intentStartRef = useRef(entry.intentStart);
  const dragPhaseRef = useRef<DragPhase>("intent");
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dragPhaseRef.current = dragPhase;
  }, [dragPhase]);

  useEffect(() => {
    if (dragPhase !== "intent" && dragPhase !== "dragging") return;

    const onMove = (e: MouseEvent) => {
      if (dragPhaseRef.current === "intent") {
        const dx = e.clientX - intentStartRef.current.x;
        const dy = e.clientY - intentStartRef.current.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          dragOffsetRef.current = {
            x: posRef.current.x - e.clientX,
            y: posRef.current.y - e.clientY,
          };
          setDragPhase("dragging");
        }
      } else if (dragPhaseRef.current === "dragging") {
        const w = typeof window !== "undefined" ? window.innerWidth : 1024;
        const h = typeof window !== "undefined" ? window.innerHeight : 768;
        const portalW = divRef.current?.offsetWidth ?? entry.popoverMaxWidth;
        const portalH = divRef.current?.offsetHeight ?? entry.popoverMaxHeight;
        const clampedX = Math.max(
          VIEWPORT_PADDING,
          Math.min(e.clientX + dragOffsetRef.current.x, w - portalW - VIEWPORT_PADDING),
        );
        const clampedY = Math.max(
          VIEWPORT_PADDING,
          Math.min(e.clientY + dragOffsetRef.current.y, h - portalH - VIEWPORT_PADDING),
        );
        posRef.current = { x: clampedX, y: clampedY };
        setPos({ x: clampedX, y: clampedY });
      }
    };

    const onUp = () => {
      setDragPhase("pinned");
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragPhase, entry.popoverMaxWidth, entry.popoverMaxHeight]);

  const handleDragHandleMouseDown = (e: ReactMouseEvent) => {
    if (dragPhase === "pinned") {
      intentStartRef.current = { x: e.clientX, y: e.clientY };
      setDragPhase("intent");
    }
  };

  const isDragging = dragPhase === "dragging";

  return createPortal(
    <div
      ref={divRef}
      className="fixed z-50 overflow-auto rounded-lg border bg-popover p-4 shadow-md"
      style={{
        left: pos.x,
        top: pos.y,
        ...(entry.isImageContent
          ? { maxWidth: entry.popoverMaxWidth }
          : { width: entry.popoverMaxWidth }),
        maxHeight: entry.popoverMaxHeight,
        cursor: isDragging ? "grabbing" : undefined,
      }}
    >
      {entry.renderContent(onRemove, handleDragHandleMouseDown)}
    </div>,
    document.body,
  );
}

export function FloatingPreviewKeeperProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<KeeperEntry[]>([]);

  const register = useCallback((entry: KeeperEntry) => {
    setEntries((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
  }, []);

  const unregister = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <FloatingPreviewKeeperContext.Provider value={{ register, unregister }}>
      {children}
      {typeof document !== "undefined" &&
        entries.map((entry) => (
          <KeeperPreview
            key={entry.id}
            entry={entry}
            onRemove={() => unregister(entry.id)}
          />
        ))}
    </FloatingPreviewKeeperContext.Provider>
  );
}
