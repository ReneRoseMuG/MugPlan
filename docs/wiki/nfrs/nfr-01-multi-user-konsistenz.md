# NFR-01: Multi-User-Konsistenz

## Metadaten

- Status: Abgeschlossen
- Kategorie: Konsistenz
- Typ: NFR
- Quelle: Notion `https://www.notion.so/313da094354e810db445c5ffe0c054f9`
- Übernommen: 09.05.26

## Beschreibung

Das System muss parallele Nutzung durch mehrere Benutzer oder mehrere Browser-Sessions ermöglichen, ohne dass Änderungen still überschrieben werden, fachliche Invarianten verletzt werden, inkonsistente Zustände entstehen oder Race Conditions unbemerkt bleiben.

Das System garantiert deterministische Konsistenz bei parallelen Mutationen.

## Geltungsbereich

Diese Anforderung gilt für:

- alle mutierenden REST-Endpoints (`POST`, `PUT`, `PATCH`, `DELETE`)
- alle versionierten Entitäten
- alle Service-Operationen mit fachlichen Abhängigkeiten
- alle Operationen mit zeitlicher Logik, insbesondere Termine und Mitarbeiterzuweisung

## Technische Mindestanforderungen

### Optimistic Locking

Alle mutierbaren Kernentitäten müssen eine `version`-Spalte besitzen.

Updates dürfen nur erfolgen, wenn ID und Version dem aktuellen Persistenzstand entsprechen.

Bei Versionsabweichung muss der Server deterministisch mit `HTTP 409 CONFLICT` und dem maschinenlesbaren Code `VERSION_CONFLICT` antworten.

### Transaktionale Fachregelprüfung

Fachregeln mit konkurrierenden Zuständen müssen innerhalb einer DB-Transaktion geprüft und angewendet werden.

Beispiele:

- Mitarbeiter darf keine Terminüberschneidung haben.
- Archivierte Projekte dürfen keine neuen Termine erhalten.
- Gesperrte Termine dürfen nicht verändert werden.

Operationen müssen atomar sein: vollständiger Commit oder vollständiger Rollback.

### Server als alleinige Wahrheit

Der Client darf keine Fachregeln erzwingen, keine Konfliktentscheidungen treffen und keine Versionslogik lokal berechnen.

Der Server entscheidet immer auf Basis des aktuellen DB-Zustands.

### Fehlerstandardisierung

Konflikte müssen maschinenlesbar sein.

Verbindliche Fehlercodes:

- `VERSION_CONFLICT`
- `BUSINESS_RULE_CONFLICT`
- `LOCK_VIOLATION`
- `NOT_FOUND`
- `VALIDATION_ERROR`

### Aktive Änderungsbenachrichtigung

Das System muss angemeldete Benutzer proaktiv informieren, wenn Daten, die sie gerade betrachten oder bearbeiten, durch einen anderen Benutzer verändert wurden.

Dies ergänzt das Optimistic Locking: Statt den Konflikt erst beim Speichern zu erkennen, wird der Benutzer bereits während der Bearbeitung informiert.

#### Transportmechanismus

Das System stellt für jeden angemeldeten Benutzer eine persistente Server-Push-Verbindung über Server-Sent Events bereit. Die Verbindung wird beim Login aufgebaut und bleibt für die Dauer der Session offen.

#### Auslöser

Nach jeder erfolgreich abgeschlossenen mutierenden Operation schreibt der Server einen Eintrag in ein internes `change_log`. Dieser Eintrag enthält Entitätstyp, Entitäts-ID, Zeitstempel und die ID des verursachenden Benutzers.

Das System sendet daraufhin ein SSE-Ereignis an alle verbundenen Sessions mit Ausnahme der Session des verursachenden Benutzers.

#### Verhalten bei Verbindungsunterbrechung

Baut der Client die SSE-Verbindung neu auf, übermittelt er die ID des zuletzt empfangenen Ereignisses. Der Server liefert alle `change_log`-Einträge nach, die seit diesem Zeitpunkt entstanden sind, sodass keine Änderungen verloren gehen.

#### Verhalten im Client

Der Client wertet eingehende Ereignisse nicht-blockierend aus. Er zeigt dem Benutzer einen Hinweis, dass sich Daten geändert haben, und bietet die Möglichkeit, die aktuellen Daten neu zu laden.

Eine automatische Überschreibung laufender Bearbeitungen findet nicht statt.

#### Abgrenzung zum Optimistic Locking

Beide Mechanismen sind komplementär und bleiben unabhängig voneinander aktiv. Die Benachrichtigung ist ein Komfortmechanismus.

Der Versionskonflikt beim Speichern bleibt die harte, nicht umgehbare Absicherung.
