# Arbeitsauftrag an Coding Agent – Testdokumentation generieren und aktualisieren

WICHTIG – ZU BEGINN DER AUSFÜHRUNG

Lies vor Beginn der Arbeit vollständig die Dateien `.ai/architecture.md` und `.ai/rules.md`.
Bestätige im Ausführungsprotokoll ausdrücklich:
„architecture.md und rules.md gelesen und verstanden“.

---

## Ziel des Auftrags

Es soll eine vollständig lesbare, strukturierte Testdokumentation unter `reports/testing/` erstellt bzw. aktualisiert werden.

Dieser Auftrag umfasst ausschließlich Analyse und Dokumentation.

Es dürfen:
- keine Tests verändert
- keine Tests ergänzt
- keine Tests gelöscht
- keine Implementierungen angepasst
- keine Refactorings vorgenommen
werden.

Es geht ausschließlich um die Erstellung und Pflege der Dokumentation.

---

## Zielstruktur

Folgende Ordner- und Dateistruktur muss existieren bzw. aktualisiert werden:

reports/testing/

- TEST_INDEX.md

- technical/
  - multi-user.md
  - transactions.md
  - visibility-access.md
  - test-isolation.md

- domain/
  - termin.md
  - projekt.md
  - mitarbeiter.md
  - team.md
  - tour.md
  - projektstatus.md
  - kunde.md

Falls einzelne Dateien noch nicht existieren, sind sie anzulegen.

---

## Inhaltliche Anforderungen

### 1. TEST_INDEX.md

Enthält:
- Stand (aktuelles Datum)
- Verlinkung auf alle Technical- und Domain-Dokumente
- Optional: kompakte Statusmatrix mit Abdeckungsübersicht

Das Masterdokument darf keine fachlichen Details enthalten.

---

### 2. Technical-Dokumente

Hier werden systemische und architektonische Absicherungen dokumentiert.

Beispiele für Inhalte:
- Multi User / Optimistic Locking
- Versionierung
- Atomare Join-Operationen
- Batch-Rollback
- Sichtbarkeit nach Rollen
- Filterung deaktivierter Entitäten
- Test-DB-Reset-Strategie
- Isolation von Integrationstests

Für jeden dokumentierten Punkt sind folgende Informationen anzugeben:

- Kurzbeschreibung der abgesicherten Systemgarantie
- Testtyp (Unit oder Integration)
- Ob echte Test-DB beteiligt ist
- Welche Erwartung geprüft wird
- Referenz auf zugehörige Testdateien

Formulierung in klaren, kurzen Sätzen.
Keine Codeblöcke.
Keine Implementationserklärungen.

---

### 3. Domain-Dokumente

Für jedes Domänenobjekt (z. B. Termin, Projekt, Mitarbeiter etc.) ist jede fachliche Regel separat zu dokumentieren.

Für jede Regel ist anzugeben:

- Überschrift: "Regel: <fachliche Aussage>"
- Testtyp (Unit oder Integration)
- DB-Beteiligung (echte Test-DB oder nicht)
- Welche Erwartung geprüft wird
- Referenz auf Testdatei(en)

Beispielhafte Regeltypen:
- Historische Termine dürfen nicht angelegt werden
- Projekt mit bestehenden Terminen darf nicht gelöscht werden
- Mitarbeiter darf nicht doppelt verplant werden
- Deaktivierte Entitäten erscheinen nicht in Auswahl-APIs

Jede Regel ist in kurzen, verständlichen Sätzen zu beschreiben.
Keine technischen Details.
Keine internen Implementierungsdetails.

---

## Qualitätsanforderungen

- Die Dokumentation muss für einen fachlich denkenden Entwickler verständlich sein.
- Keine Aufzählung bloßer Dateinamen ohne Beschreibung.
- Keine Redundanz zwischen Technical- und Domain-Bereich.
- Klare Trennung zwischen Systemabsicherung und Fachregel.
- Keine Annahmen treffen. Nur dokumentieren, was tatsächlich durch Tests abgedeckt ist.

---

## Abschlussanforderungen

Am Ende der Ausführung ist zu liefern:

1. Eine Liste aller neu erstellten oder aktualisierten Dateien.
2. Eine kurze Zusammenfassung:
   - Welche Systembereiche sind vollständig abgedeckt?
   - Welche Domänenobjekte haben Lücken?
3. Keine Codeänderungen.

---

Dieser Auftrag darf keine Änderungen am Anwendungscode oder an Testdateien enthalten.
Nur Dokumentation unter `reports/testing/` ist zulässig.

