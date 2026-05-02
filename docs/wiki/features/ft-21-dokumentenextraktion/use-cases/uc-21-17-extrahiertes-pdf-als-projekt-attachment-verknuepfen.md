# UC 21/17: Extrahiertes PDF als Projekt-Attachment verknüpfen

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../feature.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

System

## Ziel

Nach erfolgreicher Projektanlage das extrahierte PDF automatisch als `project_attachment` des neu angelegten Projekts persistieren. Duplikat-Verdacht transparent prüfen und dem Administrator ggf. eine Entscheidungsmöglichkeit bieten.

## Vorbedingungen

- Ein Doc Extract wurde durchgeführt (UC 21/01 bis UC 21/04)
- Ein neues Projekt wurde erfolgreich angelegt (UC 21/09 oder UC 21/10)
- Das extrahierte PDF existiert und ist technisch zugänglich
- Die Projekt-ID des neu angelegten Projekts ist verfügbar

## Ablauf

1. Das System hat ein neues Projekt erfolgreich persistiert (UC 21/09 oder UC 21/10)
2. Das System greift auf das extrahierte PDF zu (Dateiname und Dateigröße sind bekannt)
3. Das System führt eine Duplikat-Prüfung durch:
    - Query `customer_attachment`: Existiert ein Eintrag mit gleichem `original_filename`?
    - Query `project_attachment`: Existiert ein Eintrag mit gleichem `original_filename`?
    - Query `employee_attachment`: Existiert ein Eintrag mit gleichem `original_filename`?
4. Falls Duplikat gefunden: Das System zeigt dem Administrator einen Dialog: „Eine Datei mit diesem Namen existiert bereits bei [Kunde/Projekt/Mitarbeiter]. Trotzdem verknüpfen?"
5. Bei Button „Ja, verknüpfen": Das System fährt mit Schritt 7 fort
6. Bei Button „Nein, abbrechen": Das System zeigt Info-Nachricht „Projekt angelegt. Dokumentverknüpfung wurde übersprungen." und beendet den Prozess ohne Attachment-Persistierung
7. Falls kein Duplikat gefunden: Das System persistiert das Attachment direkt
8. Das System speichert die Attachment-Metadaten:
    - `project_id`: ID des neu angelegten Projekts
    - `original_filename`: Dateiname des PDF (z.B. „Auftrag_12345.pdf")
    - `persistent_filename`: Eindeutig generiert vom System (FT (19))
    - `mime_type`: „application/pdf"
    - `file_size`: Größe in Bytes
    - `created_at`: Jetzt
9. Das System zeigt Erfolgs-Meldung: „Projekt angelegt und Dokument verknüpft."

## Alternativen

- PDF-Datei existiert nicht mehr → System loggt Fehler, zeigt Warnung: „Projekt angelegt, aber Dokumentverknüpfung nicht möglich (Datei nicht erreichbar). Sie können das Dokument manuell hochladen."
- Duplikat-Query schlägt fehl (Datenbankfehler) → System loggt Fehler, Attachment wird trotzdem versucht zu persistieren (fail-safe), User-Feedback: „Projekt angelegt, Dokumentprüfung fehlgeschlagen, Dokument wurde trotzdem verknüpft."
- Attachment-Persistierung schlägt fehl → System loggt Fehler, zeigt Warnung: „Projekt angelegt, aber Dokumentverknüpfung ist fehlgeschlagen. Sie können das Dokument manuell hochladen."
- Administrator lehnt Duplikat ab → Kein Attachment wird persistiert, Projekt bleibt bestehen

## Ergebnis

Das extrahierte PDF ist als `project_attachment` des neu angelegten Projekts persistiert. `original_filename` und Metadaten sind korrekt gespeichert. Das Attachment ist im Projekt-Sidebar abrufbar (Phase 1: Projektformular – Attachment Panel). Es entstehen keine doppelten Attachments (Duplikat-Prüfung aktiv). Administrator hat volle Kontrolle über Duplikat-Entscheidungen.
