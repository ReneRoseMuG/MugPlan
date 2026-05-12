# FT (21): Dokumentenextraktion

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

FT (21) erweitert das System um eine kontextgebundene Dokumentenextraktion zur Unterstützung der Disposition.

Aus einem textbasierten Auftragsdokument (PDF) sollen automatisiert folgende Daten extrahiert werden:

- Kundendaten gemäß bestehendem Kundenschema
- Saunamodell (als Projekttitel-Vorschlag)
- Artikelliste (Menge + Beschreibung, mehrzeilig möglich, ohne Preise)

Die extrahierten Daten werden als editierbarer Vorschlag präsentiert und können in das aktuelle Formular (Neues Projekt oder Neuer Termin) übernommen werden.

Das Feature dient ausschließlich der Arbeitserleichterung.

Es ersetzt keine bestehende Validierungs- oder Sicherheitslogik.

## Fachliche Beschreibung

Die Extraktionsfunktion ist ausschließlich in folgenden Kontexten verfügbar:

- Formular **Neues Projekt**
- Formular **Neuer Termin**

Die Disponentin kann ein PDF in einen definierten Extraktionsbereich ziehen.

Das System:

1. Extrahiert den Text aus dem Dokument.
2. Segmentiert strukturelle Bereiche (Kunde, Artikelliste, Auftragsblock).
3. Extrahiert strukturierte Kundendaten.
4. Extrahiert eine Artikelliste.
5. Erkennt das Saunamodell.
6. Kategorisiert die Artikelliste semantisch.
7. Liefert ein validiertes Ergebnis zurück.

## Präsentation

Nach erfolgreicher Extraktion erscheint ein schwebender Dialog.

### Bereich 1 – Kundendaten

Nachbildung des Kunden-Edit-Formulars mit vorbefüllten Feldern.

Alle Felder sind editierbar.

### Bereich 2 – Projektvorschlag

Titelfeld:

- Vorgefüllt mit erkanntem Saunamodell.

Editorfeld (RTF/HTML-kompatibel):

- Extrahierte, sortierte Artikelliste.
- Darstellung als strukturierte HTML-Auflistung.
- Vollständig editierbar.

### Formular- und Übernahmeführung

Die Dokumentextraktion nutzt das gemeinsame Dialogsystem als geführten Übernahmeprozess. Der Extraktionsdialog zeigt die erkannten Kundendaten, den Projektvorschlag und die strukturierten Auftragspositionen als editierbaren Vorschlag. Warnungen zu unvollständigen oder unsicheren Daten werden im Dialog beziehungsweise direkt am betroffenen Bereich angezeigt. Der Start der Extraktion und die Anzeige des Vorschlags persistieren noch keine fachlichen Kunden-, Projekt- oder Termindaten.

Die Übernahme kopiert bestätigte Extraktionsdaten in das aktuell geöffnete Formular. Im Kontext **Neues Projekt** bleibt das eingelesene PDF danach als Draft-Dokument im Projektformular sichtbar und kann zur manuellen Prüfung in einem neuen Browser-Tab geöffnet werden. Beim späteren Speichern des Projekts werden projektbezogene Entscheidungen wie Artikellistenhinweise, Projekttitel aus Saunamodell, Reklamationsnotiz und PDF-Duplikatentscheidung über den Speichern-Review aus [FT (02): Projekte](../ft-02-projekte/ft-02-projekte.md) gebündelt. Im Kontext **Neuer Termin** werden nur die für den Termin zulässigen Kunden- und Projektvorschläge übernommen; die Terminmutation bleibt an die Regeln aus [FT (01): Kalendertermine](../ft-01-kalendertermine/ft-01-kalendertermine.md) gebunden.

Ein Abbruch im Extraktionsdialog oder das Schließen des Dialogs verwirft den noch nicht übernommenen Vorschlag. Bereits bestehende Formularinhalte werden nur nach ausdrücklicher Bestätigung überschrieben. Erkannte Kundendubletten werden nach den dokumentierten Use Cases behandelt: fehlende Stammdaten dürfen kontrolliert ergänzt werden, unerwartete Überschreibungen ohne Systembestätigung sind nicht zulässig.

Fehlermeldungen aus Parsing, Kategorisierung, ungeeigneten Dokumenten oder gelöschten Parent-Objekten müssen verständlich bleiben und dürfen keine Rohtexte, Prompts, Parserdetails, HTTP-Codes oder technischen JSON-Antworten anzeigen. Die serverseitige Rollen- und Berechtigungsprüfung bleibt maßgeblich; der Dialog dient nur der Benutzerführung und ersetzt keine Validierungs- oder Sicherheitslogik.

## Regeln & Randbedingungen

- Die Verarbeitung erfolgt ausschließlich serverseitig.
- Es werden keine Dokumente oder Texte an externe Dienste übertragen.
- Dokumenttexte werden nicht persistiert.
- Prompts und Rohtexte werden nicht geloggt.
- Ungültige oder unvollständige Daten dürfen nicht gespeichert werden.
- Die Speicherung erfolgt nur nach Benutzerbestätigung.
- Rollen- und Berechtigungslogik wird serverseitig geprüft.
- FT (21) verändert das Attachment-Modell aus FT (19) nicht.
- FT (21) verändert keine bestehenden Domänenmodelle.
- Das Feature darf keine impliziten Datenänderungen auslösen.
- Bei strukturell ungeeigneten Dokumenten muss der Prozess sauber abbrechen.
- DIe Kundennummer gilt als Duplikat Key für Kunden
- Erkannte Duplikate werden zum stillen Auffüllen von Kundenstammdaten verwendet

## Use Cases

- [UC 21/01: Dokumentextraktion starten](use-cases/uc-21-01-dokumentextraktion-starten.md)
- [UC 21/02: Extrahierte Daten bestätigen](use-cases/uc-21-02-extrahierte-daten-bestaetigen.md)
- [UC 21/03: Ungeeignetes Dokument behandeln](use-cases/uc-21-03-ungeeignetes-dokument-behandeln.md)
- [UC 21/04: Kategorisierung schlägt fehl](use-cases/uc-21-04-kategorisierung-schlaegt-fehl.md)
- [UC 21/05: Dokumentextraktion im Formular „Neues Projekt“ starten](use-cases/uc-21-05-dokumentextraktion-im-formular-neues-projekt-starten.md)
- [UC 21/06: Dokumentextraktion im Formular „Neuer Termin“ starten](use-cases/uc-21-06-dokumentextraktion-im-formular-neuer-termin-starten.md)
- [UC 21/07: Kundendaten übernehmen – Scope Neues Projekt](use-cases/uc-21-07-kundendaten-uebernehmen-scope-neues-projekt.md)
- [UC 21/08: Kundendaten übernehmen – Scope Neuer Termin](use-cases/uc-21-08-kundendaten-uebernehmen-scope-neuer-termin.md)
- [UC 21/09: Projekt übernehmen – Scope Neues Projekt](use-cases/uc-21-09-projekt-uebernehmen-scope-neues-projekt.md)
- [UC 21/10: Projekt übernehmen – Scope Neuer Termin](use-cases/uc-21-10-projekt-uebernehmen-scope-neuer-termin.md)
- [UC 21/11: Extraktionsvorgang abbrechen](use-cases/uc-21-11-extraktionsvorgang-abbrechen.md)
- [UC 21/12: Extraktion bei bestehendem Kunden im Termin-Kontext](use-cases/uc-21-12-extraktion-bei-bestehendem-kunden-im-termin-kontext.md)
- [UC 21/13: Wiederholte Extraktion desselben Dokuments](use-cases/uc-21-13-wiederholte-extraktion-desselben-dokuments.md)
- [UC 21/14: Extraktion bei zwischenzeitlich gelöschtem Parent-Objekt](use-cases/uc-21-14-extraktion-bei-zwischenzeitlich-geloeschtem-parent-objekt.md)
- [UC 21/17: Extrahiertes PDF als Projekt-Attachment verknüpfen](use-cases/uc-21-17-extrahiertes-pdf-als-projekt-attachment-verknuepfen.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
