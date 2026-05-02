# FT (19): Attachments

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/0a3cbd97ab474bd68d30b0c09ed3a822
- Importquelle lokal: `C:/Users/schro/Desktop/FT (19) Attachments 0a3cbd97ab474bd68d30b0c09ed3a822.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature stellt eine domänenübergreifende Infrastruktur zur Verfügung, um Dateien strukturiert an fachliche Objekte zu binden. Ziel ist es, Upload, Speicherung, Anzeige und Download von Dokumenten einheitlich, sicher und wartbar umzusetzen, ohne die jeweilige Fachdomäne mit technischer Dateilogik zu belasten.

Attachments sind keine fachlichen Kerndaten, sondern ergänzende Dokumente zur Dokumentation, Nachvollziehbarkeit und Kommunikation.

## Fachliche Beschreibung

Ein Attachment ist eine Datei, die eindeutig einem Parent-Objekt zugeordnet ist. Ein Attachment kann nie ohne Parent existieren.

Das System unterstützt Attachments aktuell für folgende Domänen:

- Projekt
- Kunde
- Mitarbeiter
- Termin

Die technische Behandlung ist für alle Domänen identisch. Unterschiede bestehen ausschließlich in der Parent-Zuordnung.

Ein Attachment besitzt Metadaten wie:

- Originaldateiname
- Persistenter Speichername
- MIME-Typ
- Dateigröße
- Erstellungszeitpunkt

Dateien werden serverseitig gespeichert und über einen gesicherten Download-Endpunkt ausgeliefert. Die UI zeigt Attachments als kompakte Liste mit Vorschau- bzw. Download-Funktion.

Das Öffnen eines Attachments kann je nach Dateityp inline (z. B. PDF, Bild) oder als Download erfolgen. Eine explizite Download-Option ist zusätzlich verfügbar.

Attachments können über einen expliziten Lösch-Workflow entfernt werden. Der Workflow unterscheidet zwei Stufen: Entkopplung (Datensatz wird entfernt, physische Datei bleibt erhalten) und physische Löschung (Datensatz und Datei werden vollständig entfernt). Die physische Löschung erfordert eine explizite Nutzerentscheidung und ist bei Auftragsdokumenten nicht empfohlen.

## Regeln & Randbedingungen

### Allgemeine Struktur

- Ein Attachment gehört immer genau einem Parent-Objekt.
- Ein Attachment kann nie ohne Parent-Zuordnung existieren.
- Für jede unterstützte Domäne existiert eine eigene Attachment-Tabelle.
- Die Tabellen sind strukturgleich aufgebaut.
- Zwischen Parent und Attachment besteht eine referenzielle Integrität (FK).

### Upload

- Upload erfolgt über Multipart-Request.
- Feldname für die Datei ist systemweit einheitlich.
- Es gilt eine definierte maximale Dateigröße.
- Der Originaldateiname wird serverseitig sanitisiert.
- Der persistente Dateiname wird eindeutig generiert.
- Metadaten werden in der jeweiligen Attachment-Tabelle gespeichert.

Ungültige Dateien oder Überschreiten der Größenbegrenzung führen zu einem Fehler und werden nicht gespeichert.

### Speicherung

- Dateien werden serverseitig in einem definierten Upload-Verzeichnis gespeichert.
- Der physische Speicherort wird nicht vom Client bestimmt.
- Der Storage-Pfad wird als Metadatum gespeichert.
- Attachments werden nicht versioniert.

### Download

- Download erfolgt ausschließlich über definierte API-Endpunkte.
- Der Endpunkt liefert:
    - korrekten MIME-Typ
    - passende Content-Disposition
- Für bestimmte Dateitypen (z. B. PDF, Bilder) kann Inline-Anzeige erlaubt sein.
- Über einen expliziten Parameter kann Download erzwungen werden.

Direkter Zugriff auf das Upload-Verzeichnis ist nicht vorgesehen.

### Löschung

- Attachments können über einen Lösch-Workflow entfernt werden, der zwei Stufen unterscheidet.
- Stufe 1 — Entkopplung: Der Attachment-Datensatz wird entfernt, die physische Datei bleibt im Upload-Verzeichnis erhalten.
- Stufe 2 — Physische Löschung: Datensatz und physische Datei werden vollständig entfernt. Nur mit expliziter Nutzerentscheidung.
- Vor jeder Löschoperation wird dem Akteur folgende Sicherheitsfrage gestellt: „Soll nur die Verknüpfung zum [Termin / Projekt / Kunde / Mitarbeiter] entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)“
- Die Sicherheitsfrage benennt den konkreten Parent-Typ dynamisch.
- Löschung setzt Änderungsrechte auf das Parent-Objekt voraus.
- UI: Jedes Attachment-Badge erhält einen Action-Button, der den Lösch-Workflow auslöst.
- API-seitig sind Delete-Endpunkte vorhanden und durch Berechtigungsprüfung abgesichert.

### Sicherheit und Verantwortlichkeit

- Die Parent-Existenz wird vor Speicherung eines Attachments geprüft.
- Attachments haben keine eigenständigen Berechtigungen, sondern folgen den Berechtigungen ihres Parents.
- UI-seitige Einschränkungen ersetzen keine serverseitige Prüfung.
- Der Download erfolgt ausschließlich nach erfolgreicher Identifikation des Attachments.

## Use Cases

- [UC 19/01: Attachment hochladen](use-cases/uc-19-01-attachment-hochladen.md)
- [UC 19/02: Attachmentliste anzeigen](use-cases/uc-19-02-attachmentliste-anzeigen.md)
- [UC 19/03: Attachment öffnen (Inline-Anzeige)](use-cases/uc-19-03-attachment-oeffnen-inline-anzeige.md)
- [UC 19/04: Attachment herunterladen](use-cases/uc-19-04-attachment-herunterladen.md)
- [UC 19/05: Attachment-Upload validieren (Größe / Typ)](use-cases/uc-19-05-attachment-upload-validieren-groesse-typ.md)
- [UC 19/06: Lösch-Workflow initiieren (Action Button)](use-cases/uc-19-06-loesch-workflow-initiieren-action-button.md)
- [UC 19/07: Verhalten bei Löschung eines Parent-Objekts](use-cases/uc-19-07-verhalten-bei-loeschung-eines-parent-objekts.md)
- [UC 19/08: Serverseitige Berechtigungsprüfung bei Attachment-Zugriff](use-cases/uc-19-08-serverseitige-berechtigungspruefung-bei-attachment-zugriff.md)
- [UC 19/09: Attachment an Termin verwalten](use-cases/uc-19-09-attachment-an-termin-verwalten.md)
- [UC 19/10: Attachment-Duplikat entfernen](use-cases/uc-19-10-attachment-duplikat-entfernen.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
