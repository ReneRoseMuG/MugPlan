# FT (06): Automatische Regeln

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/33fda094354e8029a54fc0c7a6cc1588
- Importquelle lokal: `C:/Users/schro/Desktop/FT (06) Automatische Regeln 33fda094354e8029a54fc0c7a6cc1588.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature führt ein zentrales fachliches Regelwerk ein, das in definierten Situationen automatisch auf Änderungen im Planungsprozess reagiert. Das Regelwerk unterstützt Disponenten durch Hinweise, Bestätigungsentscheidungen und automatische Folgeaktionen. Es dient dazu, wiederkehrende fachliche Abläufe einheitlich, nachvollziehbar und ohne widersprüchliches Verhalten in der gesamten Anwendung abzubilden.

## Fachliche Beschreibung

Automatische Regeln greifen bei ausgewählten fachlichen Ereignissen, insbesondere beim Speichern von Projekten und Terminen, beim Setzen fachlich relevanter Tags sowie bei Änderungen der Tourzuordnung von Terminen. Das System reagiert dabei mit Hinweisen, vorgeschlagenen Folgeaktionen oder stillen automatischen Nachführungen, wenn dies fachlich erforderlich ist.

Ein Schwerpunkt des Features liegt auf einheitlichen Folgeaktionen für Systemzustände wie **Storniert** und **Geparkt**. Diese Zustände dürfen nicht wie gewöhnliche frei verfügbare Tags behandelt werden, sondern folgen eigenen fachlichen Regeln. Der Zustand **Geparkt** ist an die Systemtour **Parkplatz** gekoppelt. Zusätzlich umfasst das Feature automatische Folgebeziehungen zwischen bestimmten Touren, Tags und Notizvorlagen, zum Beispiel im Umfeld von **Messe** und **Reklamation**.

Der Zustand **Reklamation** wird als geschützter Systemzustand behandelt. Er wird nicht über den generischen Tag-Picker gesetzt oder entfernt, sondern über explizite Reklamationsfunktionen am Termin oder am Projekt. Diese Funktionen setzen bzw. entfernen das System-Tag **Reklamation** und können anschließend einen optionalen Notizfluss starten. Beim Setzen wird eine Reklamationsnotiz aus der passenden Notizvorlage vorgeschlagen, sofern noch keine passende Notiz vorhanden ist. Beim Aufheben einer Reklamation kann eine vorhandene Reklamationsnotiz auf Wunsch entfernt oder bewusst beibehalten werden.

Das Feature beschreibt fachliche Regeln, nicht technische Implementierungsdetails. Maßgeblich ist, dass dieselbe fachliche Situation überall in der Anwendung zu demselben Ergebnis führt, unabhängig davon, an welcher Oberfläche sie ausgelöst wurde.

## Regeln & Randbedingungen

- Automatische Regeln gelten systemweit einheitlich für alle fachlich gleichartigen Bearbeitungssituationen.
- Das Regelwerk unterstützt den Bearbeitungsfluss durch Hinweise, Bestätigungen und automatische Folgeaktionen, ersetzt aber keine fachlichen Pflichtprüfungen anderer Features.
- Die Entscheidung des Akteurs bei einem Hinweis oder Vorschlag betrifft nur die angebotene Folgeaktion. Die zugrunde liegende Primäraktion bleibt davon getrennt zu betrachten.
- Systemzustände und Systemobjekte unterliegen besonderen Schutzregeln und dürfen nicht wie frei bearbeitbare Standardobjekte behandelt werden.
- Automatisch erzeugte Folgeobjekte, insbesondere Notizen aus Vorlagen, dürfen nicht unbegrenzt dupliziert werden.
- Reklamationsnotizen werden nur vorgeschlagen. Die Reklamation selbst wird unabhängig davon gesetzt oder aufgehoben, ob der Akteur die Notiz anlegt, überspringt, löscht oder behält.
- Für Reklamationen darf pro Objekt kein unbeabsichtigter Notizduplikatfluss entstehen. Existiert bereits eine passende Reklamationsnotiz, wird kein weiterer Vorschlag geöffnet.
- Beim Aufheben einer Reklamation wird eine vorhandene Reklamationsnotiz nicht stillschweigend gelöscht. Der Akteur entscheidet explizit, ob die Notiz entfernt oder als Dokumentation behalten wird.
- Die Systemtour **Parkplatz** ist von der Wochenplanung ausgeschlossen.
- Automatische Folgeänderungen müssen fachlich konsistent sein und dürfen keine widersprüchlichen Zustände hinterlassen.

## Use Cases

- [UC 06/00: Termin stornieren](use-cases/uc-06-00-termin-stornieren.md)
- [UC 06/01: Tag Anmerkungen bei Projektbeschreibung automatisch setzen](use-cases/uc-06-01-tag-anmerkungen-bei-projektbeschreibung-automatisch-setzen.md)
- [UC 06/02: Reklamationsnotiz bei Reklamation vorschlagen](use-cases/uc-06-02-reklamationsnotiz-bei-reklamation-vorschlagen.md)
- [UC 06/03: Messe-Workflow bei Zuordnung zur Tour Messe](use-cases/uc-06-03-messe-workflow-bei-zuordnung-zur-tour-messe.md)
- [UC 06/04: Termin auf Parkplatz setzen](use-cases/uc-06-04-termin-auf-parkplatz-setzen.md)
- [UC 06/05: Wochenplanung für Parkplatz sperren](use-cases/uc-06-05-wochenplanung-fuer-parkplatz-sperren.md)
- [UC 06/06: Zustand Geparkt bei Wechsel weg von Parkplatz automatisch entfernen](use-cases/uc-06-06-zustand-geparkt-bei-wechsel-weg-von-parkplatz-automatisch-entfernen.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
