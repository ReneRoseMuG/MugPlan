# A-16 - Dialog-Rollout-Masterplan

## Metadaten

- Status: in Bearbeitung
- Dringlichkeit: Hoch
- Thema: Dialoge
- Typ: Planung / Koordination
- Erstellt: 08.05.26
- Quelle: PLAN_Dialoge.md (Export/Upload 08.05.26 des Strategieplans)
- Verantwortlich: offen
- Journal: siehe Abschnitt Journal

## Beziehungen

- Features:
  - [FT-01 - Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
  - [FT-03 - Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md)
  - [FT-04 - Tourenplanung](../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Use Cases:
  - —
- Entscheidungen:
  - —
- Weitere Bezüge:
  - [A-09 - FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](a-09-ft04-dialog-basiskomponente.md)
  - [A-10 - FT-04 mehrstufiger Tour-KW-Dialog](a-10-ft04-multistep-tour-kw-dialog.md)
  - [A-11 - FT-19 Attachment-Testlücken](a-11-ft19-attachment-testluecken.md)
  - [A-12 - Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](a-12-termin-tour-kw-mutationsdialoge.md)
  - [A-13 - FT-04 Multiselect KW-Planung Wochenkalender](a-13-ft04-multiselect-kw-planung-wochenkalender.md)
  - [A-14 - Mitarbeiter-Auswahl-Dialogstruktur](a-14-mitarbeiter-auswahl-dialogstruktur.md)
  - [A-15 - FT-26 Report-Print-Basiskomponente](a-15-ft26-report-print-basiskomponente.md)
  - [Dialoge und Meldungen - Pfade](../dialoge-und-meldungen-pfade.md)
  - [Relations](../relations.md)
  - [Journal](../journal/README.md)

## Ziel

Diese Master-Task führt den Dialog-Rollout als lebendiges Koordinationsdokument. Sie trennt den Gesamtplan in delegierbare Teilbereiche, hält Abhängigkeiten fest und verweist auf die vorhandenen Aufgaben A-09 bis A-15. Die Umsetzung soll Benutzerkommunikation über Bestätigungen, Entscheidungsdialoge und dauerhafte Inline-Meldungen vereinheitlichen, ohne Toasts als eigenes Rollout-Ziel zu behandeln. Besonders komplexe Termin-, Tour- und KW-Mutationen werden als eigener Teilbereich geführt, damit sie nicht mit einfacheren Domain-Dialogen vermischt werden. Serverregeln zu Rollen, Sperren, Versionen und Mitarbeiterkonflikten bleiben dabei maßgeblich.

## Ausgangslage

Der Strategieplan vom 08.05.26 liegt als Export unter dem Namen PLAN_Dialoge.md vor. Zusätzlich existieren A-09 bis A-15 als verwandte Einzelaufgaben, die bisher nicht über eine gemeinsame Rollout-Struktur verbunden sind. Die Inventurdatei `docs/wiki/dialoge-und-meldungen-pfade.md` enthält die erste Gruppierung relevanter Dialog-, Bestätigungs- und Meldungspfade.

## Teilbereiche

| Nr. | Teilbereich | Task | Status |
|---|---|---|---|
| 0 | Statische Inventur | (in dieser Datei, Abschnitt unten) | offen |
| 1 | Fehler-Normalisierung | [a-17-fehler-normalisierung.md](a-17-fehler-normalisierung.md) | offen |
| 2 | Basiskomponenten | [a-18-dialog-basiskomponenten.md](a-18-dialog-basiskomponenten.md) | offen |
| 3 | Tour-KW / Termin-Mutationen | [a-19-tour-kw-termin-mutationsdialoge.md](a-19-tour-kw-termin-mutationsdialoge.md) | offen |
| 4 | Termine und Kalenderdialoge | [a-20-termine-und-kalenderdialoge.md](a-20-termine-und-kalenderdialoge.md) | offen |
| 5 | Projekte und Dokumentextraktion | [a-21-projekte-und-dokumentextraktion-dialoge.md](a-21-projekte-und-dokumentextraktion-dialoge.md) | offen |
| 6 | Kunden | [a-22-kunden-dialoge.md](a-22-kunden-dialoge.md) | offen |
| 7 | Mitarbeiter | [a-23-mitarbeiter-dialoge.md](a-23-mitarbeiter-dialoge.md) | offen |
| 8 | Teams | [a-24-teams-dialoge.md](a-24-teams-dialoge.md) | offen |
| 9 | Notizen | [a-25-notizen-dialoge.md](a-25-notizen-dialoge.md) | offen |
| 10 | Stammdaten, Produkte und Komponenten | [a-26-stammdaten-produkte-komponenten-dialoge.md](a-26-stammdaten-produkte-komponenten-dialoge.md) | offen |
| 11 | Benutzer und Sicherheit | [a-27-benutzer-und-sicherheit-dialoge.md](a-27-benutzer-und-sicherheit-dialoge.md) | offen |
| 12 | Tags | [a-28-tags-dialoge.md](a-28-tags-dialoge.md) | offen |
| 13 | Reports und Druck | [a-29-reports-und-druck-dialoge.md](a-29-reports-und-druck-dialoge.md) | offen |
| 14 | Hilfetexte, Import und Export | [a-30-hilfetexte-import-export-dialoge.md](a-30-hilfetexte-import-export-dialoge.md) | offen |
| 15 | Einstellungen, Monitoring und Admin | [a-31-einstellungen-monitoring-admin-dialoge.md](a-31-einstellungen-monitoring-admin-dialoge.md) | offen |

## Ergebnis der statischen Inventur

| Datei | window.confirm | response.text() | Rohfehler-Risiko | Domain |
|---|---|---|---|---|
| (wird durch Teilbereich 0 befüllt) | | | | |

## Umfang

Zur Master-Task gehören die Pflege der Teilbereichsliste, der Statusüberblick, die statische Inventur und die Verweise auf zugehörige Task-Dateien. Nicht Teil dieser Aufgabe sind UI-Komponenten, API-Änderungen, Schemaänderungen oder konkrete Dialogimplementierungen.

## Umsetzungshinweise

- Die Reihenfolge bleibt: statische Inventur, Fehler-Normalisierung, Basiskomponenten, Tour-KW/Termin-Mutationen, danach Domain-Objekte.
- Generische Dialograhmen und wiederverwendbare Auswahlrahmen gehören zu A-18; Domain-Tasks führen fachliche Nutzungsstellen.
- Tour-KW und komplexe Termin-Mutationen bleiben in A-19, auch wenn einzelne Komponenten zusätzlich in Domain-Tasks als angrenzende Kommunikation auftauchen.
- Rollenverhalten wird in dieser Strukturaufgabe nicht geändert. Spätere Umsetzungen müssen ADMIN, DISPONENT und LESER ausdrücklich prüfen und serverseitige Guards beibehalten.

## Offene Entscheidungen

Folgende Punkte sind vor der Delegation einzelner Teilbereiche zu klären.

1. Notiz-Pflichtentscheidung beim Verschieben: Komfortmerkmal oder blockierender Dialog-Schritt? (FT-01 sagt: Notizen bleiben immer erhalten.)
2. Schritt 4 des Gesamtplans muss aufgeteilt werden: erst Preview-Contract-Erweiterung (Server), dann Verschiebe-Dialog (Client).
3. Fehlerzustand nach partieller Execute-Ausführung im Stepper: Was sieht der Nutzer, was kann er tun?
4. Commit-Zeitpunkt in A-10 nachtragen: Mutationen erst nach finaler Gesamtbestätigung, seriell über bestehende Execute-Endpunkte.
5. A-07/A-08 (DnD, Mark & Insert): Integrationsstatus klären — läuft der Verschiebevorgang bereits über den Preview-Pfad?

## Anhänge

- —

## Blocker und offene Fragen

- Die offenen Entscheidungen in diesem Dokument müssen vor der Delegation der betroffenen Umsetzungsschritte geklärt werden.

## Abschluss

- Abgeschlossen am: offen
- Ergebnis: offen
- Verifikation: offen
- Folgeaufgaben: offen

## Journal

### 08.05.26 — Anlage
Masterplan angelegt auf Basis von PLAN_Dialoge.md (Upload 08.05.26) und Planprüfung durch Claude.
Teilbereiche 0–3 als Stubs erzeugt. Domain-Objekte (4–N) werden nach statischer Inventur ergänzt.
