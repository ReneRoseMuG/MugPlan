# UC 21/17: Extrahiertes PDF als Projekt-Attachment verknÃ¼pfen

## Metadaten

- Feature: [FT (21): Dokumentenextraktion](../ft-21-dokumentenextraktion.md)
- Notion-Quelle: https://app.notion.com/p/7f1c87cde87a4ab98db0469dd0af81c1
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

System

## Ziel

Nach erfolgreicher Projektanlage das extrahierte PDF automatisch als `project_attachment` des neu angelegten Projekts persistieren. Duplikat-Verdacht transparent prÃ¼fen und dem Administrator ggf. eine EntscheidungsmÃ¶glichkeit bieten.

## Vorbedingungen

- Ein Doc Extract wurde durchgefÃ¼hrt (UC 21/01 bis UC 21/04)
- Ein neues Projekt wurde erfolgreich angelegt (UC 21/09 oder UC 21/10)
- Das extrahierte PDF existiert und ist technisch zugÃ¤nglich
- Die Projekt-ID des neu angelegten Projekts ist verfÃ¼gbar

## Ablauf

1. Das System hat ein neues Projekt erfolgreich persistiert (UC 21/09 oder UC 21/10)
2. Das System greift auf das extrahierte PDF zu (Dateiname und DateigrÃ¶ÃŸe sind bekannt)
3. Das System fÃ¼hrt eine Duplikat-PrÃ¼fung durch:
    - Query `customer_attachment`: Existiert ein Eintrag mit gleichem `original_filename`?
    - Query `project_attachment`: Existiert ein Eintrag mit gleichem `original_filename`?
    - Query `employee_attachment`: Existiert ein Eintrag mit gleichem `original_filename`?
4. Falls Duplikat gefunden: Das System zeigt dem Administrator einen Dialog: â€žEine Datei mit diesem Namen existiert bereits bei [Kunde/Projekt/Mitarbeiter]. Trotzdem verknÃ¼pfen?"
5. Bei Button â€žJa, verknÃ¼pfen": Das System fÃ¤hrt mit Schritt 7 fort
6. Bei Button â€žNein, abbrechen": Das System zeigt Info-Nachricht â€žProjekt angelegt. DokumentverknÃ¼pfung wurde Ã¼bersprungen." und beendet den Prozess ohne Attachment-Persistierung
7. Falls kein Duplikat gefunden: Das System persistiert das Attachment direkt
8. Das System speichert die Attachment-Metadaten:
    - `project_id`: ID des neu angelegten Projekts
    - `original_filename`: Dateiname des PDF (z.B. â€žAuftrag_12345.pdf")
    - `persistent_filename`: Eindeutig generiert vom System (FT (19))
    - `mime_type`: â€žapplication/pdf"
    - `file_size`: GrÃ¶ÃŸe in Bytes
    - `created_at`: Jetzt
9. Das System zeigt Erfolgs-Meldung: â€žProjekt angelegt und Dokument verknÃ¼pft."

## Alternativen

- PDF-Datei existiert nicht mehr â†’ System loggt Fehler, zeigt Warnung: â€žProjekt angelegt, aber DokumentverknÃ¼pfung nicht mÃ¶glich (Datei nicht erreichbar). Sie kÃ¶nnen das Dokument manuell hochladen."
- Duplikat-Query schlÃ¤gt fehl (Datenbankfehler) â†’ System loggt Fehler, Attachment wird trotzdem versucht zu persistieren (fail-safe), User-Feedback: â€žProjekt angelegt, DokumentprÃ¼fung fehlgeschlagen, Dokument wurde trotzdem verknÃ¼pft."
- Attachment-Persistierung schlÃ¤gt fehl â†’ System loggt Fehler, zeigt Warnung: â€žProjekt angelegt, aber DokumentverknÃ¼pfung ist fehlgeschlagen. Sie kÃ¶nnen das Dokument manuell hochladen."
- Administrator lehnt Duplikat ab â†’ Kein Attachment wird persistiert, Projekt bleibt bestehen

## Ergebnis

Das extrahierte PDF ist als `project_attachment` des neu angelegten Projekts persistiert. `original_filename` und Metadaten sind korrekt gespeichert. Das Attachment ist im Projekt-Sidebar abrufbar (Phase 1: Projektformular â€“ Attachment Panel). Es entstehen keine doppelten Attachments (Duplikat-PrÃ¼fung aktiv). Administrator hat volle Kontrolle Ã¼ber Duplikat-Entscheidungen.

