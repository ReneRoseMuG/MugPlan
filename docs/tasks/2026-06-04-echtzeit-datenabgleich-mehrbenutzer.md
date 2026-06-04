# Codex-Auftrag: Echtzeit-Datenabgleich für Mehrbenutzer-Betrieb automatisieren

**Parent:** MS-43 – Architektur und Test Suite Änderungen
**Datum:** 2026-06-04
**Aufgaben-ID:** TASK-219

---

## Ziel

Jede Datenänderung in MuGPlan soll automatisch und ohne manuelles Eingreifen in allen
offenen Browser-Tabs sichtbar werden — unabhängig davon, ob die Änderung von einem anderen
Nutzer oder vom selben Nutzer in einem anderen Tab stammt. Ein Tab, der sich gerade im
Edit-Modus befindet, darf nicht automatisch neu geladen werden; er zeigt stattdessen den
bisherigen Toast.

---

## Hintergrund & Kontext

MuGPlan verfügt bereits über eine vollständige SSE-Infrastruktur
(`server/controllers/changeNotificationsController.ts`,
`server/services/changeNotificationsService.ts`) sowie einen ausgereiften
Client-seitigen Provider (`client/src/providers/ChangeNotificationsProvider.tsx`).

Der Provider empfängt SSE-Events vom Server, filtert eigene Änderungen heraus
(`actorUserId`-Vergleich) und setzt bei fremden Änderungen `updatesAvailable = true`,
was einen Toast auslöst. Der Nutzer muss dann manuell „Neu Laden" klicken, um
`triggerGlobalReload()` aufzurufen.

Parallele Tabs desselben Nutzers werden über `BroadcastChannel` und `localStorage`
koordiniert. Eigene Mutationen invalidieren nur den Tab, der die Aktion ausgeführt hat —
andere Tabs des gleichen Nutzers bleiben veraltet.

Optimistic Locking ist bereits implementiert (`version_conflict` in den Repositories).
Pessimistisches Locking und server-seitige Presence sind explizit **nicht** Teil dieses
Auftrags.

---

## Aufgabe

### Schritt 1 — Refs für Edit-Zustand und Reload-Funktion

In `client/src/providers/ChangeNotificationsProvider.tsx`:

Füge zwei Refs hinzu, die stets den aktuellen Zustand halten, ohne Closure-Probleme
in den Effect-Callbacks zu erzeugen:

```ts
const isReloadDisabledRef = useRef(false);
const performAutoReloadRef = useRef<() => Promise<void>>(async () => undefined);
```

Synchronisiere `isReloadDisabledRef` in einem eigenen `useEffect`, der auf
`isReloadDisabled` reagiert:

```ts
useEffect(() => {
  isReloadDisabledRef.current = isReloadDisabled;
}, [isReloadDisabled]);
```

Implementiere `performAutoReload` als `useCallback` (analog zu `performLocalReload`):

```ts
const performAutoReload = useCallback(async () => {
  if (localEditLocksRef.current.size > 0) {
    setUpdatesAvailable(true);
    return;
  }
  try {
    await queryClient.invalidateQueries();
  } catch {
    setUpdatesAvailable(true);
  }
}, []);
```

Halte `performAutoReloadRef` aktuell:

```ts
useEffect(() => {
  performAutoReloadRef.current = performAutoReload;
}, [performAutoReload]);
```

### Schritt 2 — Automatischer Reload bei fremden SSE-Events

In `handleChangeEvent` (der EventSource-Handler, ab Zeile ~449):

Ersetze das bisherige Verhalten (immer nur `setUpdatesAvailable(true)` und
`broadcastMessage`) durch:

```ts
const handleChangeEvent = (event: MessageEvent<string>) => {
  const parsed = toChangeNotificationEvent(event.data);
  if (!parsed) return;

  // Eigene Änderungen weiterhin ignorieren — eigene Tabs werden über BroadcastChannel
  // aus der MutationCache-Integration (Schritt 4) versorgt.
  if (parsed.actorUserId != null && parsed.actorUserId === currentUserIdRef.current) {
    return;
  }

  // Alle anderen Tabs im gleichen Browser informieren
  broadcastMessage({ type: "updates-available" });

  // Eigenen Tab direkt aktualisieren, wenn kein Formular offen ist
  void performAutoReloadRef.current();
};
```

### Schritt 3 — Automatischer Reload bei BroadcastChannel-Nachrichten

Im `handleWorkspaceMessage`-Handler, case `"updates-available"`:

Ersetze `setUpdatesAvailable(true)` durch:

```ts
case "updates-available":
  void performAutoReloadRef.current();
  return;
```

`performAutoReload` setzt selbst `setUpdatesAvailable(true)`, wenn der Tab editiert —
der Toast erscheint also weiterhin korrekt.

### Schritt 4 — Eigene Mutationen in anderen Tabs propagieren

In `client/src/lib/queryClient.ts`:

Füge einen `MutationCache` mit einem globalen `onSuccess`-Callback hinzu, der nach jeder
erfolgreichen Mutation die anderen eigenen Tabs über den BroadcastChannel benachrichtigt.

Der `workspaceId`-Wert liegt im localStorage unter dem Key
`ft32.changeNotifications.workspaceId` (Konstante `WORKSPACE_ID_STORAGE_KEY` aus dem
Provider — den Wert direkt aus localStorage lesen, nicht importieren).

```ts
import { MutationCache, QueryClient } from "@tanstack/react-query";

const WORKSPACE_ID_STORAGE_KEY = "ft32.changeNotifications.workspaceId";

function broadcastOwnChange(): void {
  const workspaceId = window.localStorage.getItem(WORKSPACE_ID_STORAGE_KEY);
  if (!workspaceId) return;

  const channelName = `ft32-change-notifications:${workspaceId}`;
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({
      type: "updates-available",
      messageId: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    });
    channel.close();
  } catch {
    // BroadcastChannel nicht verfügbar — kein Fallback nötig, SSE übernimmt
  }
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      broadcastOwnChange();
    },
  }),
  // ... bestehende defaultOptions
});
```

**Wichtig:** Prüfe, ob `queryClient.ts` bereits eine `QueryClient`-Instanz mit
`defaultOptions` anlegt. Falls ja, füge `mutationCache` als weiteren Parameter hinzu,
ohne die bestehende Konfiguration zu verändern.

### Schritt 5 — Toast-Verhalten prüfen

Stelle sicher, dass der Toast „Änderungen verfügbar" nur noch dann angezeigt wird,
wenn `updatesAvailable === true` — also wenn `performAutoReload` wegen eines aktiven
Edit-Locks auf `setUpdatesAvailable(true)` gefallen ist.

Das bestehende `useEffect` (Zeilen ~473–480) bleibt unverändert, da es direkt auf
`updatesAvailable` reagiert.

Der „Neu Laden"-Button (`triggerGlobalReload`) bleibt erhalten für den Fall, dass
ein Nutzer den Toast manuell bestätigen möchte.

---

## Technische Leitplanken

- Keine neuen Abhängigkeiten einführen — BroadcastChannel ist native Web-API.
- Keine Änderungen am SSE-Server oder an `changeNotificationsService`.
- Keine Änderungen an der Route → Controller → Service → Repository-Schichtentrennung.
- `queryClient.ts` darf nicht den `ChangeNotificationsProvider` importieren (Circular
  Dependency). Der BroadcastChannel-Name und localStorage-Key werden in `queryClient.ts`
  lokal wiederholt (kein zentraler Export aus dem Provider).
- Die bestehende `triggerGlobalReload`-Logik (ACK-Mechanismus über mehrere Tabs) bleibt
  vollständig erhalten — sie wird nur nicht mehr als automatischer Reload-Pfad verwendet.
- Edit Locks (`useEntityFormEditLock`) dürfen durch diese Änderung nicht beeinflusst werden.

---

## Regeln & Randfälle

- **Tab im Edit-Modus**: `localEditLocksRef.current.size > 0` → kein auto-Reload,
  stattdessen Toast setzen. Der Nutzer muss nach dem Speichern manuell neu laden oder
  warten, bis der Edit-Lock freigegeben wird und der nächste Event eintrifft.
- **Mehrere schnell aufeinander folgende SSE-Events**: `queryClient.invalidateQueries()`
  ist idempotent — Mehrfachaufrufe sind harmlos, React Query bündelt das intern.
- **BroadcastChannel nicht verfügbar** (ältere Browser): Der try/catch in
  `broadcastOwnChange` schluckt den Fehler. Fremde Änderungen kommen weiterhin via SSE.
- **Eigene Tab-Doppel-Invalidierung**: Tab A speichert → `MutationCache.onSuccess` feuert
  → BroadcastChannel → Tab A empfängt eigene Nachricht → `performAutoReload` läuft →
  doppelte Invalidierung in Tab A. Das ist harmlos, da React Query bereits nach der
  Mutation invalidiert hat.
- **`triggerGlobalReload` aufgerufen während auto-Reload läuft**: Beide rufen
  `queryClient.invalidateQueries()` auf — idempotent, kein Problem.

---

## Seiteneffekte

- **`queryClient.ts`**: Erhält erstmals einen `MutationCache`. Bestehende
  `defaultOptions`-Konfiguration bleibt unverändert.
- **`ChangeNotificationsProvider.tsx`**: Das Toast-Verhalten ändert sich: Toast erscheint
  nur noch, wenn Auto-Reload wegen Edit-Lock unterdrückt wurde. Für Nutzer ohne offene
  Formulare ist der Toast künftig unsichtbar.
- Alle Mutations im gesamten Client-Code profitieren automatisch — keine Anpassungen an
  einzelnen Mutations-Hooks nötig.

---

## Testanforderungen

### Unit-Tests

- `performAutoReload` aufrufen, wenn kein Edit-Lock aktiv → `queryClient.invalidateQueries`
  wird aufgerufen.
- `performAutoReload` aufrufen, wenn Edit-Lock aktiv → `setUpdatesAvailable(true)` wird
  gesetzt, `invalidateQueries` wird nicht aufgerufen.
- `broadcastOwnChange` ohne `workspaceId` im localStorage → kein Fehler, kein
  BroadcastChannel-Aufruf.

### Integrationstests

Nicht erforderlich — keine Server-seitigen Änderungen.

### Manuelle Verifikation

1. Zwei Browser-Tabs öffnen, beide auf der Kalenderansicht.
2. In Tab A einen Termin verschieben und speichern.
3. Tab B aktualisiert sich ohne Nutzereingriff innerhalb weniger Sekunden.
4. In Tab B ein Formular öffnen (Edit-Lock aktiv), dann in Tab A eine Änderung speichern.
5. In Tab B erscheint der Toast — kein automatischer Reload.
6. Nach Schließen des Formulars in Tab B: nächster eintreffender SSE-Event löst
   automatischen Reload aus.
7. Zwei verschiedene Nutzer (zwei Browsersessions): Änderung von Nutzer A ist in
   Nutzer Bs Tab ohne manuellen Eingriff sichtbar.

---

## Abnahmekriterien

- Änderungen eines anderen Nutzers sind in allen nicht-editierenden Tabs automatisch
  sichtbar, ohne dass der Nutzer den Toast bestätigen oder „Neu Laden" klicken muss.
- Eigene Änderungen in Tab A sind in Tab B desselben Nutzers automatisch sichtbar.
- Ein Tab mit geöffnetem Bearbeitungsformular wird nicht automatisch neu geladen.
  Der Toast erscheint korrekt.
- Nach Schließen des Formulars reagiert der Tab wieder auf den nächsten eintreffenden
  SSE-Event mit automatischem Reload.
- Kein kreisförmiger Import zwischen `queryClient.ts` und
  `ChangeNotificationsProvider.tsx`.
- Bestehende Tests laufen weiterhin grün.
