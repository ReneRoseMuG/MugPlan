# Dialog-Rollout-Masterplan

Diese Master-Task führt den Dialog-Rollout als lebendiges Koordinationsdokument. Sie trennt den Gesamtplan in delegierbare Teilbereiche, hält Abhängigkeiten fest und koordiniert die verwandten Einzelaufgaben. Die Umsetzung soll Benutzerkommunikation über Bestätigungen, Entscheidungsdialoge und dauerhafte Inline-Meldungen vereinheitlichen, ohne Toasts als eigenes Rollout-Ziel zu behandeln.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `in Bearbeitung` | Hoch | Dialoge | Planung | 08.05.26 |

---

## Ziel

Diese Master-Task führt den Dialog-Rollout als lebendiges Koordinationsdokument. Sie trennt den Gesamtplan in delegierbare Teilbereiche, hält Abhängigkeiten fest und verweist auf die vorhandenen Aufgaben FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente bis FT-26 gemeinsame Print-Basiskomponente für Kartenreports. Die Umsetzung soll Benutzerkommunikation über Bestätigungen, Entscheidungsdialoge und dauerhafte Inline-Meldungen vereinheitlichen, ohne Toasts als eigenes Rollout-Ziel zu behandeln. Besonders komplexe Termin-, Tour- und KW-Mutationen werden als eigener Teilbereich geführt, damit sie nicht mit einfacheren Domain-Dialogen vermischt werden. Serverregeln zu Rollen, Sperren, Versionen und Mitarbeiterkonflikten bleiben dabei maßgeblich.

## Ausgangslage

Der Strategieplan vom 08.05.26 liegt als Export unter dem Namen PLAN_Dialoge.md vor. Zusätzlich existieren FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente bis FT-26 gemeinsame Print-Basiskomponente für Kartenreports als verwandte Einzelaufgaben, die bisher nicht über eine gemeinsame Rollout-Struktur verbunden sind. Die Inventurdatei `docs/wiki/tasks/a-16-dialog-rollout-masterplan/dialoge-und-meldungen-pfade.md` enthält die erste Gruppierung relevanter Dialog-, Bestätigungs- und Meldungspfade.

## Umfang

- Zur Master-Task gehören die Pflege der Teilbereichsliste, der Statusüberblick, die statische Inventur und die Verweise auf zugehörige Task-Dateien. Nicht Teil dieser Aufgabe sind UI-Komponenten, API-Änderungen, Schemaänderungen oder konkrete Dialogimplementierungen.
- 0: Statische Inventur: (in dieser Datei, Abschnitt unten): offen
- 1: Fehler-Normalisierung: [fehler-normalisierung.md](fehler-normalisierung.md): offen
- 2: Basiskomponenten: [dialog-basiskomponenten.md](dialog-basiskomponenten.md): offen
- 3: Tour-KW / Termin-Mutationen: [tour-kw-termin-mutationsdialoge.md](tour-kw-termin-mutationsdialoge.md): offen
- 4: Termine und Kalenderdialoge: [termine-und-kalenderdialoge.md](termine-und-kalenderdialoge.md): offen
- 5: Projekte und Dokumentextraktion: [projekte-und-dokumentextraktion-dialoge.md](projekte-und-dokumentextraktion-dialoge.md): offen
- 6: Kunden: [kunden-dialoge.md](kunden-dialoge.md): offen
- 7: Mitarbeiter: [mitarbeiter-dialoge.md](mitarbeiter-dialoge.md): offen
- 8: Teams: [teams-dialoge.md](teams-dialoge.md): offen
- 9: Notizen: [notizen-dialoge.md](notizen-dialoge.md): offen
- 10: Stammdaten, Produkte und Komponenten: [stammdaten-produkte-komponenten-dialoge.md](stammdaten-produkte-komponenten-dialoge.md): offen
- 11: Benutzer und Sicherheit: [benutzer-und-sicherheit-dialoge.md](benutzer-und-sicherheit-dialoge.md): offen
- 12: Tags: [tags-dialoge.md](tags-dialoge.md): offen
- 13: Reports und Druck: [reports-und-druck-dialoge.md](reports-und-druck-dialoge.md): offen
- 14: Hilfetexte, Import und Export: [hilfetexte-import-export-dialoge.md](hilfetexte-import-export-dialoge.md): offen
- 15: Einstellungen, Monitoring und Admin: [einstellungen-monitoring-admin-dialoge.md](einstellungen-monitoring-admin-dialoge.md): offen
- (wird durch Teilbereich 0 befüllt)

## Umsetzungshinweise

- Die Reihenfolge bleibt: statische Inventur, Fehler-Normalisierung, Basiskomponenten, Tour-KW/Termin-Mutationen, danach Domain-Objekte.
- Generische Dialograhmen und wiederverwendbare Auswahlrahmen gehören zu Dialog-Basiskomponenten; Domain-Tasks führen fachliche Nutzungsstellen.
- Tour-KW und komplexe Termin-Mutationen bleiben in Tour-KW- und Termin-Mutationsdialoge, auch wenn einzelne Komponenten zusätzlich in Domain-Tasks als angrenzende Kommunikation auftauchen.
- Rollenverhalten wird in dieser Strukturaufgabe nicht geändert. Spätere Umsetzungen müssen ADMIN, DISPONENT und LESER ausdrücklich prüfen und serverseitige Guards beibehalten.
- Folgende Punkte sind vor der Delegation einzelner Teilbereiche zu klären.
- Notiz-Pflichtentscheidung beim Verschieben: Komfortmerkmal oder blockierender Dialog-Schritt? (FT-01 sagt: Notizen bleiben immer erhalten.)
- Schritt 4 des Gesamtplans muss aufgeteilt werden: erst Preview-Contract-Erweiterung (Server), dann Verschiebe-Dialog (Client).
- Fehlerzustand nach partieller Execute-Ausführung im Stepper: Was sieht der Nutzer, was kann er tun?
- Commit-Zeitpunkt in FT-04 mehrstufiger Tour-KW-Dialog nachtragen: Mutationen erst nach finaler Gesamtbestätigung, seriell über bestehende Execute-Endpunkte.
- Die abgeschlossenen Vorarbeiten zu Drag & Drop und Mark & Insert müssen auf ihren Integrationsstatus geprüft werden: Läuft der Verschiebevorgang bereits über den Preview-Pfad?
- ### 08.05.26 — Anlage
- Masterplan angelegt auf Basis von PLAN_Dialoge.md (Upload 08.05.26) und Planprüfung durch Claude.
- Teilbereiche 0–3 als Stubs erzeugt. Domain-Objekte (4–N) werden nach statischer Inventur ergänzt.

## Blocker und offene Fragen

- Die offenen Entscheidungen in diesem Dokument müssen vor der Delegation der betroffenen Umsetzungsschritte geklärt werden.

---

## Beziehungen

- Features: [FT-01 - Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md) · [FT-03 - Kalenderansichten](../features/ft-03-kalenderansichten/ft-03-kalenderansichten.md) · [FT-04 - Tourenplanung](../features/ft-04-tourenplanung/ft-04-tourenplanung.md)
- Entscheidungen: —
- Weitere Bezüge: [Dialog-Rollout](../projects/dialog-rollout.md) · [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](ft04-multistep-tour-kw-dialog.md) · [FT-19 Attachment-Testlücken](ft19-attachment-testluecken.md) · [Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](termin-tour-kw-mutationsdialoge.md) · [FT-04 Multiselect KW-Planung Wochenkalender](ft04-multiselect-kw-planung-wochenkalender.md) · [Mitarbeiter-Auswahl-Dialogstruktur](mitarbeiter-auswahl-dialogstruktur.md) · [FT-26 Report-Print-Basiskomponente](ft26-report-print-basiskomponente.md) · [Dialoge und Meldungen - Pfade](a-16-dialog-rollout-masterplan/dialoge-und-meldungen-pfade.md) · [Relations](../relations.md) · [Journal](../journal/README.md)
