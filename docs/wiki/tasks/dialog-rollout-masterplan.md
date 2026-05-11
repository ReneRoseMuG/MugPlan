# Dialog-Rollout-Masterplan

Diese Master-Task führt den Dialog-Rollout als lebendiges Koordinationsdokument. Sie trennt den Gesamtplan in delegierbare Teilbereiche, hält Abhängigkeiten fest und koordiniert die verwandten Einzelaufgaben. Die Umsetzung soll Benutzerkommunikation über Bestätigungen, Entscheidungsdialoge und dauerhafte Inline-Meldungen vereinheitlichen, ohne Toasts als eigenes Rollout-Ziel zu behandeln.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `in Bearbeitung` | Hoch | Dialoge | Planung | 08.05.26 |

---

## Ziel

Diese Master-Task führt den Dialog-Rollout als lebendiges Koordinationsdokument für Projekt P-01. Sie trennt den Gesamtplan in delegierbare Teilbereiche, hält Abhängigkeiten fest und verweist auf die operative Projektseite mit vollständiger Reihenfolge, Testsuite und Protokollierungsregeln. Besonders komplexe Termin-, Tour- und KW-Mutationen werden bewusst an das Ende gestellt, damit sie nicht mit einfacheren Domain-Dialogen vermischt werden.

## Ausgangslage

Der Strategieplan vom 08.05.26 liegt als Export unter dem Namen PLAN_Dialoge.md vor. Zusätzlich existieren einzelne Dialog-Aufgaben, die über Projekt P-01 in eine fachlich sinnvolle Reihenfolge gebracht wurden. Die Inventurdatei `docs/wiki/tasks/a-16-dialog-rollout-masterplan/dialoge-und-meldungen-pfade.md` enthält die erste Gruppierung relevanter Dialog-, Bestätigungs- und Meldungspfade.

## Umfang

- Zur Master-Task gehören die Pflege der P01-Reihenfolge, der Statusüberblick, die statische Inventur und die Verweise auf zugehörige Task-Dateien. Nicht Teil dieser Aufgabe sind UI-Komponenten, API-Änderungen, Schemaänderungen oder konkrete Dialogimplementierungen.
- Die vollständige Ausführungsreihenfolge und Testsuite steht auf der Projektseite [Dialog-Rollout](../projects/dialog-rollout.md).
- Die Grundlagenreihenfolge ist abgeschlossen: [Fehler-Normalisierung](closed/fehler-normalisierung.md), [Dialog-Basiskomponenten](closed/dialog-basiskomponenten.md). Beide Aufgaben wurden mit einem echten Domain-Dialog manuell geprüft.
- Die ersten und mittleren Domain-Schritte sind abgeschlossen: [Teams-Dialoge](closed/teams-dialoge.md), [Stammdaten-, Produkte- und Komponenten-Dialoge](closed/stammdaten-produkte-komponenten-dialoge.md), [Tags-Dialoge](closed/tags-dialoge.md), [Hilfetexte-, Import- und Export-Dialoge](closed/hilfetexte-import-export-dialoge.md), [Einstellungen-, Monitoring- und Admin-Dialoge](closed/einstellungen-monitoring-admin-dialoge.md), [Reports- und Druck-Dialoge](closed/reports-und-druck-dialoge.md), [Kunden-Dialoge](closed/kunden-dialoge.md), [Mitarbeiter-Dialoge](closed/mitarbeiter-dialoge.md), [Notizen-Dialoge](closed/notizen-dialoge.md) und [Benutzer- und Sicherheitsdialoge](closed/benutzer-und-sicherheit-dialoge.md). Weiter offen bleibt [Projekte- und Dokumentextraktion-Dialoge](projekte-und-dokumentextraktion-dialoge.md).
- Zum Schluss folgen die komplexen Tour-, Tour-KW-, Termin- und Kalenderaufgaben: [Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](closed/termin-tour-kw-mutationsdialoge.md), [Mitarbeiter-Auswahl-Komponente für Dialogstruktur refaktorieren](closed/mitarbeiter-auswahl-dialogstruktur.md), [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](closed/ft04-dialog-basiskomponente.md), [Tour-KW- und Termin-Mutationsdialoge](closed/tour-kw-termin-mutationsdialoge.md), [FT-04 mehrstufiger Tour-KW-Dialog](closed/ft04-multistep-tour-kw-dialog.md), [FT-04 Multiselect für KW-Planung im Wochenkalender](closed/ft04-multiselect-kw-planung-wochenkalender.md), [Termine- und Kalenderdialoge](closed/termine-und-kalenderdialoge.md).
- Jede Teilaufgabe muss nach erfolgreicher Umsetzung Tests, manuelle App-Prüfung, Journaleintrag, Aufgabenverlinkung und Wiki-Build dokumentieren.

## Umsetzungshinweise

- Die Reihenfolge ist absichtlich gegenüber der ersten Stufung korrigiert: nur die generischen Grundlagen zuerst, einfache Domain-Objekte danach, Tour-, Tour-KW-, Termin- und Kalenderpfade zuletzt.
- Generische Dialograhmen und wiederverwendbare Auswahlrahmen gehören zu Dialog-Basiskomponenten; Domain-Tasks führen fachliche Nutzungsstellen.
- FT-04-Bestätigungsbasis und Mitarbeiter-Auswahl sind nicht mehr als frühe Grundlagen einsortiert, weil sie fachlich bereits an Tour-KW- und Termin-Konfliktpfade gekoppelt sind.
- Tour-KW und komplexe Termin-Mutationen bleiben in Tour-KW- und Termin-Mutationsdialoge, auch wenn einzelne Komponenten zusätzlich in Domain-Tasks als angrenzende Kommunikation auftauchen.
- Die Testsuite folgt der Hybrid-Strategie: gezielte vollständige Suite je Teilaufgabe, voller Testlauf zusätzlich nach den Hochrisiko-Meilensteinen Tour-KW- und Termin-Mutationsdialoge sowie Termine- und Kalenderdialoge.
- Rollenverhalten wird in dieser Strukturaufgabe nicht geändert. Spätere Umsetzungen müssen `ADMIN`, `DISPONENT` und `READER` beziehungsweise `LESER` ausdrücklich prüfen und serverseitige Guards beibehalten.
- Nach jeder abgeschlossenen Teilaufgabe wird ein Journaleintrag erstellt, in der Aufgabe verlinkt und durch `node scripts/build-wiki-site.mjs` in die generierte Wiki-Ausgabe übernommen.
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
- Weitere Bezüge: [Dialog-Rollout](../projects/dialog-rollout.md) · [FT-04 gemeinsame Bestätigungs-Dialog-Basiskomponente](closed/ft04-dialog-basiskomponente.md) · [FT-04 mehrstufiger Tour-KW-Dialog](closed/ft04-multistep-tour-kw-dialog.md) · [FT-19 Attachment-Testlücken](ft19-attachment-testluecken.md) · [Termin- und Tour-KW-Mutationsdialoge vereinheitlichen](closed/termin-tour-kw-mutationsdialoge.md) · [FT-04 Multiselect KW-Planung Wochenkalender](closed/ft04-multiselect-kw-planung-wochenkalender.md) · [Mitarbeiter-Auswahl-Dialogstruktur](closed/mitarbeiter-auswahl-dialogstruktur.md) · [FT-26 Report-Print-Basiskomponente](ft26-report-print-basiskomponente.md) · [Dialoge und Meldungen - Pfade](a-16-dialog-rollout-masterplan/dialoge-und-meldungen-pfade.md) · [Relations](../relations.md) · [Journal](../journal/README.md)
