# FT (08): Journal / Änderungshistorie

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/344da094354e814a8830dab54ce60040
- Importquelle lokal: `C:/Users/schro/Desktop/FT (08) Journal Änderungshistorie 344da094354e814a8830dab54ce60040.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature stellt eine lesbare, filterbare und kontextbezogene Änderungshistorie für fachlich relevante Daten bereit. Angemeldete Benutzer mit Leseberechtigung sollen nachvollziehen können, welche Änderungen an Kunden, Projekten, Terminen, Touren und tourbezogenen Kalenderwochen vorgenommen wurden, von wem sie ausgelöst wurden und in welchem fachlichen Zusammenhang sie stehen.

## Fachliche Beschreibung

Das System protokolliert fachlich relevante Mutationen append-only in einer Journal-Struktur. Jeder Journal-Eintrag enthält mindestens den betroffenen fachlichen Datensatz, die ausgeführte Operation, den Akteur, einen Zeitstempel sowie eine lesbare Änderungsnachricht. Zusätzlich werden explizite Kontextbezüge gespeichert, damit ein Journal-Eintrag nicht nur global, sondern auch in fachlich verwandten Detailansichten sichtbar gemacht werden kann.

Zu diesen Kontexten gehören neben Self-, Parent- und Owner-Bezügen auch Tour-Kontexte und tourbezogene Kalenderwochen-Kontexte. Dadurch können Änderungen an Touren, Wochenplanung, Mitarbeiterkaskaden und Tour-KW-Notizen sowohl im globalen Journal als auch in den passenden Detailjournalen sichtbar werden, ohne doppelte Facheinträge zu erzeugen.

Das Feature stellt zwei Oberflächen bereit. Erstens eine globale Journal-Ansicht in der Anwendung, in der Journal-Einträge gefiltert, durchsucht und seitenweise gelesen werden können. Zweitens einen kontextbezogenen Journal-Tab in den Detailformularen bestehender Datensätze, über den nur die fachlich zugehörigen Journal-Einträge angezeigt werden.

Das Journal ist eine lesende Nachvollziehbarkeitsfunktion. Es ersetzt weder fachliche Validierung noch Konflikterkennung beim Speichern. Es ergänzt die aktive Änderungsbenachrichtigung aus FT (32) um eine historische und filterbare Lesesicht.

## Regeln & Randbedingungen

- Journal-Einträge sind append-only. Bereits geschriebene Einträge werden nicht editiert oder gelöscht.
- Das Schreiben von Journal-Einträgen erfolgt best effort. Eine fachliche Mutation darf nicht allein wegen eines Journal-Fehlers scheitern.
- Innerhalb eines einzelnen Journal-Schreibvorgangs werden Haupteintrag und Kontextzuordnungen atomar gespeichert.
- Jeder Journal-Eintrag besitzt mindestens einen Self-Kontext zum direkt betroffenen Datensatz.
- Parent- und Owner-Kontexte werden zusätzlich abgeleitet, damit zusammenhängende Änderungen in übergeordneten Detailjournalen sichtbar sind.
- Tour- und Kalenderwochen-Kontexte dürfen zusätzlich abgeleitet werden, wenn Änderungen fachlich sowohl einer Tour als auch einer tourbezogenen Kalenderwoche zugeordnet sind.
- Journal-Leserechte bestehen nur für Administratoren und Disponenten.
- Der Journal-Tab in Detailformularen ist nur bei bereits existierenden Datensätzen sichtbar.
- Die globale Journal-Ansicht und die Detailjournale zeigen ausschließlich gelesene Historie. Es gibt dort keine Schreib- oder Korrekturfunktion.
- Journal-Einträge sollen in einer für Disponenten verständlichen Sprache dargestellt werden. Technische Rohwerte sind nur Rückfallebene.
- Die Journal-Ansicht arbeitet paginiert und standardmäßig absteigend nach Zeitstempel.

## Abhängigkeiten

- FT (32): Aktive Änderungsbenachrichtigung – fachlich verwandt, aber getrennte Funktion. FT (32) informiert aktiv über Änderungen; FT (08) macht Änderungen historisch lesbar.
- NFR (01): Multi-User-Konsistenz – definiert den Rahmen für konkurrierende Änderungen und deren Absicherung beim Speichern.

## Use Cases

- [UC 08/01: Globales Journal öffnen](use-cases/uc-08-01-globales-journal-oeffnen.md)
- [UC 08/02: Journal filtern und durchsuchen](use-cases/uc-08-02-journal-filtern-und-durchsuchen.md)
- [UC 08/03: Kontextbezogenes Journal in einem Detailformular lesen](use-cases/uc-08-03-kontextbezogenes-journal-in-einem-detailformular-lesen.md)
- [UC 08/04: Fachliche Änderung erzeugt Journal-Eintrag](use-cases/uc-08-04-fachliche-aenderung-erzeugt-journal-eintrag.md)
- [UC 08/05: Journal ohne Leseberechtigung nicht öffnen](use-cases/uc-08-05-journal-ohne-leseberechtigung-nicht-oeffnen.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
