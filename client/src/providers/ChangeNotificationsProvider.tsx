import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type ChangeNotificationEvent } from "@shared/routes";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { getStoredUserId } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

const WORKSPACE_ID_STORAGE_KEY = "ft32.changeNotifications.workspaceId";
const WINDOW_STATE_STORAGE_PREFIX = "ft32.changeNotifications.windowState";
const MESSAGE_STORAGE_KEY_PREFIX = "ft32.changeNotifications.message";
const WINDOW_STATE_HEARTBEAT_MS = 15_000;
const WINDOW_STATE_STALE_MS = 45_000;
const RELOAD_ACK_TIMEOUT_MS = 6_000;

type WorkspaceWindowState = {
  windowId: string;
  isEditing: boolean;
  updatedAt: number;
};

type WorkspaceMessageBase = {
  messageId: string;
};

type UpdatesAvailableMessage = WorkspaceMessageBase & {
  type: "updates-available";
};

type ReloadRequestMessage = WorkspaceMessageBase & {
  type: "reload-request";
  requestId: string;
  initiatorWindowId: string;
  expectedWindowIds: string[];
};

type ReloadAckMessage = WorkspaceMessageBase & {
  type: "reload-ack";
  requestId: string;
  windowId: string;
  ok: boolean;
};

type ReloadCompleteMessage = WorkspaceMessageBase & {
  type: "reload-complete";
  requestId: string;
};

type WorkspaceMessage =
  | UpdatesAvailableMessage
  | ReloadRequestMessage
  | ReloadAckMessage
  | ReloadCompleteMessage;

type WorkspaceMessageDraft =
  | Omit<UpdatesAvailableMessage, "messageId">
  | Omit<ReloadRequestMessage, "messageId">
  | Omit<ReloadAckMessage, "messageId">
  | Omit<ReloadCompleteMessage, "messageId">;

type PendingReloadState = {
  requestId: string;
  expectedWindowIds: Set<string>;
  acknowledgedWindowIds: Set<string>;
  timeoutId: number;
};

type ChangeNotificationsContextValue = {
  updatesAvailable: boolean;
  isReloadDisabled: boolean;
  isReloadPending: boolean;
  triggerGlobalReload: () => Promise<void>;
  setEditLock: (lockId: string, active: boolean) => void;
};

const ChangeNotificationsContext = createContext<ChangeNotificationsContextValue | undefined>(undefined);
const defaultChangeNotificationsContextValue: ChangeNotificationsContextValue = {
  updatesAvailable: false,
  isReloadDisabled: false,
  isReloadPending: false,
  triggerGlobalReload: async () => undefined,
  setEditLock: () => undefined,
};

function createRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getWindowStateStoragePrefix(workspaceId: string): string {
  return `${WINDOW_STATE_STORAGE_PREFIX}:${workspaceId}:`;
}

function getWindowStateStorageKey(workspaceId: string, windowId: string): string {
  return `${getWindowStateStoragePrefix(workspaceId)}${windowId}`;
}

function getMessageStorageKey(workspaceId: string): string {
  return `${MESSAGE_STORAGE_KEY_PREFIX}:${workspaceId}`;
}

function ensureWorkspaceId(): string {
  const existing = window.localStorage.getItem(WORKSPACE_ID_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const nextValue = createRandomId();
  window.localStorage.setItem(WORKSPACE_ID_STORAGE_KEY, nextValue);
  return nextValue;
}

function readWorkspaceWindowStates(workspaceId: string): WorkspaceWindowState[] {
  const prefix = getWindowStateStoragePrefix(workspaceId);
  const now = Date.now();
  const states: WorkspaceWindowState[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(prefix)) {
      continue;
    }

    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawValue) as WorkspaceWindowState;
      if (
        !parsed
        || typeof parsed.windowId !== "string"
        || typeof parsed.isEditing !== "boolean"
        || !Number.isFinite(parsed.updatedAt)
      ) {
        continue;
      }

      if (now - parsed.updatedAt > WINDOW_STATE_STALE_MS) {
        window.localStorage.removeItem(key);
        continue;
      }

      states.push(parsed);
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  return states;
}

function toChangeNotificationEvent(data: string): ChangeNotificationEvent | null {
  try {
    const parsed = JSON.parse(data) as ChangeNotificationEvent;
    if (!Number.isInteger(parsed.id) || parsed.id <= 0 || typeof parsed.createdAt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function ChangeNotificationsProvider({ children }: { children: ReactNode }) {
  const [workspaceId] = useState(() => ensureWorkspaceId());
  const [windowId] = useState(() => createRandomId());
  const [workspaceWindowStates, setWorkspaceWindowStates] = useState<WorkspaceWindowState[]>([]);
  const [updatesAvailable, setUpdatesAvailable] = useState(false);
  const [isReloadPending, setIsReloadPending] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const processedMessageIdsRef = useRef(new Set<string>());
  const handledReloadRequestIdsRef = useRef(new Set<string>());
  const pendingReloadRef = useRef<PendingReloadState | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const localEditLocksRef = useRef(new Set<string>());
  const currentUserIdRef = useRef<number | null>(getStoredUserId());

  const syncWorkspaceWindowStates = useCallback(() => {
    setWorkspaceWindowStates(readWorkspaceWindowStates(workspaceId));
  }, [workspaceId]);

  const persistOwnWindowState = useCallback(() => {
    const nextState: WorkspaceWindowState = {
      windowId,
      isEditing: localEditLocksRef.current.size > 0,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(
      getWindowStateStorageKey(workspaceId, windowId),
      JSON.stringify(nextState),
    );
    syncWorkspaceWindowStates();
  }, [syncWorkspaceWindowStates, windowId, workspaceId]);

  const broadcastMessage = useCallback((message: WorkspaceMessageDraft) => {
    const payload = {
      ...message,
      messageId: createRandomId(),
    } as WorkspaceMessage;

    broadcastChannelRef.current?.postMessage(payload);
    window.localStorage.setItem(getMessageStorageKey(workspaceId), JSON.stringify(payload));
  }, [workspaceId]);

  const applyReloadComplete = useCallback((requestId: string) => {
    const currentPending = pendingReloadRef.current;
    if (currentPending?.requestId === requestId) {
      window.clearTimeout(currentPending.timeoutId);
      pendingReloadRef.current = null;
      setIsReloadPending(false);
    }

    setUpdatesAvailable(false);
  }, []);

  const handleReloadAck = useCallback((message: ReloadAckMessage) => {
    const pendingReload = pendingReloadRef.current;
    if (!pendingReload || pendingReload.requestId !== message.requestId) {
      return;
    }

    if (!message.ok) {
      window.clearTimeout(pendingReload.timeoutId);
      pendingReloadRef.current = null;
      setIsReloadPending(false);
      return;
    }

    pendingReload.acknowledgedWindowIds.add(message.windowId);
    if (pendingReload.acknowledgedWindowIds.size < pendingReload.expectedWindowIds.size) {
      return;
    }

    broadcastMessage({
      type: "reload-complete",
      requestId: message.requestId,
    });
    applyReloadComplete(message.requestId);
  }, [applyReloadComplete, broadcastMessage]);

  const emitReloadAck = useCallback((message: Omit<ReloadAckMessage, "messageId">) => {
    handleReloadAck({
      ...message,
      messageId: createRandomId(),
    });
    broadcastMessage(message);
  }, [broadcastMessage, handleReloadAck]);

  const performLocalReload = useCallback(async (requestId: string) => {
    if (localEditLocksRef.current.size > 0) {
      emitReloadAck({
        type: "reload-ack",
        requestId,
        windowId,
        ok: false,
      });
      return;
    }

    try {
      await queryClient.invalidateQueries();
      emitReloadAck({
        type: "reload-ack",
        requestId,
        windowId,
        ok: true,
      });
    } catch {
      emitReloadAck({
        type: "reload-ack",
        requestId,
        windowId,
        ok: false,
      });
    }
  }, [emitReloadAck, windowId]);

  const handleWorkspaceMessage = useCallback((message: WorkspaceMessage) => {
    if (processedMessageIdsRef.current.has(message.messageId)) {
      return;
    }
    processedMessageIdsRef.current.add(message.messageId);

    switch (message.type) {
      case "updates-available":
        setUpdatesAvailable(true);
        return;
      case "reload-request":
        if (handledReloadRequestIdsRef.current.has(message.requestId)) {
          return;
        }
        handledReloadRequestIdsRef.current.add(message.requestId);
        void performLocalReload(message.requestId);
        return;
      case "reload-ack":
        handleReloadAck(message);
        return;
      case "reload-complete":
        applyReloadComplete(message.requestId);
        return;
      default:
        return;
    }
  }, [applyReloadComplete, handleReloadAck, performLocalReload]);

  const triggerGlobalReload = useCallback(async () => {
    if (localEditLocksRef.current.size > 0 || isReloadPending) {
      return;
    }

    const activeWindowIds = new Set(
      readWorkspaceWindowStates(workspaceId)
        .map((state) => state.windowId)
        .filter((stateWindowId) => typeof stateWindowId === "string" && stateWindowId.length > 0),
    );
    activeWindowIds.add(windowId);

    const requestId = createRandomId();
    const timeoutId = window.setTimeout(() => {
      if (pendingReloadRef.current?.requestId !== requestId) {
        return;
      }
      pendingReloadRef.current = null;
      setIsReloadPending(false);
    }, RELOAD_ACK_TIMEOUT_MS);

    pendingReloadRef.current = {
      requestId,
      expectedWindowIds: activeWindowIds,
      acknowledgedWindowIds: new Set<string>(),
      timeoutId,
    };
    setIsReloadPending(true);

    broadcastMessage({
      type: "reload-request",
      requestId,
      initiatorWindowId: windowId,
      expectedWindowIds: Array.from(activeWindowIds),
    });

    handleWorkspaceMessage({
      type: "reload-request",
      requestId,
      initiatorWindowId: windowId,
      expectedWindowIds: Array.from(activeWindowIds),
      messageId: createRandomId(),
    });
  }, [broadcastMessage, handleWorkspaceMessage, isReloadPending, windowId, workspaceId]);

  const setEditLock = useCallback((lockId: string, active: boolean) => {
    if (active) {
      localEditLocksRef.current.add(lockId);
    } else {
      localEditLocksRef.current.delete(lockId);
    }
    persistOwnWindowState();
  }, [persistOwnWindowState]);

  useEffect(() => {
    currentUserIdRef.current = getStoredUserId();
  });

  useEffect(() => {
    persistOwnWindowState();
    syncWorkspaceWindowStates();

    const heartbeatId = window.setInterval(() => {
      persistOwnWindowState();
    }, WINDOW_STATE_HEARTBEAT_MS);

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) {
        return;
      }

      if (event.key.startsWith(getWindowStateStoragePrefix(workspaceId))) {
        syncWorkspaceWindowStates();
        return;
      }

      if (event.key !== getMessageStorageKey(workspaceId) || !event.newValue) {
        return;
      }

      try {
        const message = JSON.parse(event.newValue) as WorkspaceMessage;
        handleWorkspaceMessage(message);
      } catch {
        // ignore malformed storage messages
      }
    };

    window.addEventListener("storage", handleStorage);

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(`ft32-change-notifications:${workspaceId}`);
      channel.onmessage = (event: MessageEvent<WorkspaceMessage>) => {
        handleWorkspaceMessage(event.data);
      };
      broadcastChannelRef.current = channel;
    }

    const handleBeforeUnload = () => {
      window.localStorage.removeItem(getWindowStateStorageKey(workspaceId, windowId));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeatId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      broadcastChannelRef.current?.close();
      broadcastChannelRef.current = null;
      window.localStorage.removeItem(getWindowStateStorageKey(workspaceId, windowId));
    };
  }, [handleWorkspaceMessage, persistOwnWindowState, syncWorkspaceWindowStates, windowId, workspaceId]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return;
    }

    const eventSource = new EventSource(api.changeNotifications.stream.path, {
      withCredentials: true,
    });

    const handleChangeEvent = (event: MessageEvent<string>) => {
      const parsed = toChangeNotificationEvent(event.data);
      if (!parsed) {
        return;
      }

      if (parsed.actorUserId != null && parsed.actorUserId === currentUserIdRef.current) {
        return;
      }

      setUpdatesAvailable(true);
      broadcastMessage({
        type: "updates-available",
      });
    };

    eventSource.addEventListener("change", handleChangeEvent as EventListener);

    return () => {
      eventSource.removeEventListener("change", handleChangeEvent as EventListener);
      eventSource.close();
    };
  }, [broadcastMessage]);

  useEffect(() => {
    if (updatesAvailable) {
      setToastOpen(true);
      return;
    }

    setToastOpen(false);
  }, [updatesAvailable]);

  const isReloadDisabled = useMemo(
    () => isReloadPending || workspaceWindowStates.some((state) => state.isEditing),
    [isReloadPending, workspaceWindowStates],
  );

  const value = useMemo<ChangeNotificationsContextValue>(() => ({
    updatesAvailable,
    isReloadDisabled,
    isReloadPending,
    triggerGlobalReload,
    setEditLock,
  }), [isReloadDisabled, isReloadPending, setEditLock, triggerGlobalReload, updatesAvailable]);

  return (
    <ChangeNotificationsContext.Provider value={value}>
      {children}
      <ToastProvider>
        <Toast open={toastOpen} onOpenChange={setToastOpen}>
          <div className="grid gap-1">
            <ToastTitle>Änderungen verfügbar</ToastTitle>
            <ToastDescription>Bitte „Neu Laden“ verwenden, um alle offenen Ansichten zu aktualisieren.</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
        <ToastViewport desktopPosition="bottom-right" />
      </ToastProvider>
    </ChangeNotificationsContext.Provider>
  );
}

export function useChangeNotificationsContext(): ChangeNotificationsContextValue {
  const context = useContext(ChangeNotificationsContext);
  return context ?? defaultChangeNotificationsContextValue;
}

export function useEntityFormEditLock(active = true): void {
  const context = useContext(ChangeNotificationsContext);
  const lockIdRef = useRef(createRandomId());

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setEditLock(lockIdRef.current, active);

    return () => {
      context.setEditLock(lockIdRef.current, false);
    };
  }, [active, context]);
}
