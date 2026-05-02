# FT (28): Universelles Tagging-System

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/317da094354e81279271fc1c2d18eba4
- Importquelle lokal: `C:/Users/schro/Desktop/FT (28) Universelles Tagging-System 317da094354e81279271fc1c2d18eba4.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Ein generisches, domänenübergreifendes Tagging-System wird eingeführt, das an allen zentralen Domänenobjekten (Projekt, Kunde, Mitarbeiter, Termin) konsistent nutzbar ist. Tags ergänzen zunächst den bestehenden Projektstatus (FT 15) und können diesen mittelfristig vollständig ablösen. Das System ersetzt rudimentäres Mehrfach-Marking durch eine sauber normalisierte, rollengeschützte Infrastruktur.

## Fachliche Beschreibung

Das System besteht aus zwei Ebenen: einer zentralen `tags`-Tabelle sowie je einer Join-Tabelle pro Domänenobjekt (`project_tags`, `customer_tags`, `employee_tags`, `appointment_tags`).

Jeder Tag besitzt einen eindeutigen Namen und eine Farbe. Die Farbe wird per freiem Color-Picker gewählt und dient der visuellen Unterscheidung in Listen- und Kalenderansichten. Tags können in einer zentralen Verwaltungsansicht angelegt, umbenannt, neu eingefärbt und gelöscht werden. Die Zuweisung erfolgt im Kontext des jeweiligen Domänenobjekts. Filtern und Suchen nach Tags ist in allen Listenansichten der jeweiligen Domäne vorgesehen.

**Default Tags** sind systemseitig vordefinierte Tags, die beim initialen Setup oder per Migrations-Skript angelegt werden. Sie sind geschützte System-Tags und dürfen nicht wie frei verfügbare Tags durch Nutzer zugewiesen, entfernt, gelöscht oder umbenannt werden. Änderungen an Default Tags einschließlich Umbenennung, Farbe und Löschung sind serverseitig geschützt. In der Verwaltungsansicht sind Default Tags visuell als geschützt gekennzeichnet (z. B. Schloss-Icon).

Welche System-Tags im Tag-Picker einer Domäne erscheinen, ist pro Domäne geregelt: Bei **Mitarbeitern**, **Kunden**, **Terminen** und **Projekten** sind geschützte System-Tags aus dem generischen Picker ausgeschlossen. Der Storniert-Tag wird ausschließlich über den Storno-Workflow gesetzt. Der Reklamation-Tag wird ausschließlich über die fachlichen Reklamationsfunktionen am Termin oder am Projekt gesetzt und entfernt. Eine manuelle Zuweisung oder Entfernung über die generischen Tag-Funktionen ist für Nutzer nicht zulässig.

## Regeln & Randbedingungen

- Ein Tag-Name ist eindeutig innerhalb der zentralen `tags`-Tabelle.
- Tags können beliebig vielen Einträgen aller Domänen zugewiesen werden.
- Das Löschen eines Tags entfernt automatisch alle zugehörigen Join-Einträge (Cascade Delete).
- Tags dürfen nur vom Admin gelöscht werden und nur, wenn keine Relationen bestehen.
- Default Tags besitzen ein `is_default`-Flag und werden serverseitig vor Mutation geschützt – der Schutz wird nicht allein über die UI, sondern per API-Guard durchgesetzt.
- Die Farbwahl erfolgt über einen freien Color-Picker ohne vordefiniertes Farbset.
- Disponenten können Tags zuweisen und entfernen, aber keine Tags anlegen, umbenennen oder löschen.
- Disponenten und Administratoren können geschützte System-Tags nicht über generische Tag-Zuweisungen setzen oder entfernen. Dafür müssen die jeweiligen fachlichen Workflows verwendet werden.
- Die Sichtbarkeit von System-Tags im Tag-Picker ist domänenspezifisch geregelt (siehe Fachliche Beschreibung). Die Filterung erfolgt serverseitig über den `/api/tags?domain=`-Parameter.

## Use Cases

- [UC 28/01: Tag anlegen](use-cases/uc-28-01-tag-anlegen.md)
- [UC 28/02: Tag bearbeiten](use-cases/uc-28-02-tag-bearbeiten.md)
- [UC 28/03: Tag löschen](use-cases/uc-28-03-tag-loeschen.md)
- [UC 28/04: Tag an Domänenobjekt zuweisen](use-cases/uc-28-04-tag-an-domaenenobjekt-zuweisen.md)
- [UC 28/05: Tag-Zuweisung entfernen](use-cases/uc-28-05-tag-zuweisung-entfernen.md)
- [UC 28/06: Domänenspezifische System-Tag-Filterung im Picker](use-cases/uc-28-06-domaenenspezifische-system-tag-filterung-im-picker.md)
- [UC 28/07: Termin stornieren – Storniert-Tag über Workflow setzen](use-cases/uc-28-07-termin-stornieren-storniert-tag-ueber-workflow-setzen.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
