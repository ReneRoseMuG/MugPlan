# Auftragslog: Generisches Server-Filesystem

## Zweck

Es wurde eine fachlich neutrale Server-Komponente für persistente JSON-Dateioperationen umgesetzt. Die Komponente ist nicht report-spezifisch und kann später von fachlichen Modulen für user- oder global-gescopte JSON-Daten genutzt werden.

Als Base-Directory wird bewusst der vorhandene `BACKUP_BASE_PATH` verwendet. Der eigentliche Datastore liegt getrennt darunter im Unterordner `ServerFS`.

## Branch

- Arbeitsbranch: `feature/server-fs-file-store`
- Der Branch wurde seriell von `work` abgezweigt und nach `origin/feature/server-fs-file-store` gepusht.

## Umsetzung

- `server/config/storagePaths.ts` erweitert die bestehende Storage-Konfiguration um `getServerFileStoreBasePath()`.
- Der neue Server-Dateistore liegt unter `BACKUP_BASE_PATH/ServerFS`.
- `ServerScopedFileStore` unterstützt `readJson`, `writeJson`, `delete`, `exists` und `list`.
- USER-Dateien werden unter `users/<userId>/<namespace>/<key>.json` gespeichert.
- GLOBAL-Dateien werden unter `global/<namespace>/<key>.json` gespeichert.
- Pfadsegmente werden restriktiv validiert, damit Path Traversal, absolute Pfade, leere Segmente, Separatoren und ungültige Sonderzeichen abgelehnt werden.
- Schreiboperationen erfolgen atomisch über temporäre Datei im Zielverzeichnis und anschließendes `rename`.
- Zod-Schemas können beim Schreiben und Lesen zur Payload-Validierung genutzt werden.
- Es wurden eigene Fehlerklassen für Validierung, Berechtigung, Not Found und IO ergänzt.

## Rollen und Rechte

- Es wurde kein neuer Endpunkt, keine neue UI-Aktion und keine neue sichtbare Bedienmöglichkeit eingeführt.
- Der Store erzwingt Scope-Trennung und die `userId`-Pflicht für USER-Dateien.
- Der Store übernimmt keine fachliche Rollenautorisation.
- Spätere Konsumenten müssen Sichtbarkeit, Ausführungserlaubnis und serverseitige Rollenprüfung vor dem Aufruf des Stores selbst durchsetzen.
- Bestehende Rollenrechte wurden nicht erweitert oder aufgeweicht.

## Tests und Nachweise

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/services/serverScopedFileStore.test.ts tests/unit/config/storagePaths.test.ts`

Ergebnis:

- 2 Testdateien erfolgreich
- 16 Tests erfolgreich

Auf ausdrücklichen Nutzerwunsch wurden der vollständige Unit-Testlauf und `npm run check` nicht weitergeführt. Nach dem Abbruch wurde geprüft, dass kein Vitest-/Test-Node-Prozess übrig geblieben ist.

## Ergebnis

Der generische Server-Dateistore steht serverseitig bereit. USER- und GLOBAL-Scope sind getrennt, echte Dateien im temporären Test-Dateisystem werden verwendet, fehlende Reads liefern `null`, Deletes sind idempotent und unsichere Pfade werden blockiert.
