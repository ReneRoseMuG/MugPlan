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
- Auftragsnummer, Auftragssumme und Auftragsinhalt, sofern im Dokument erkennbar
- Dokumentvolltext als optionaler Vorschlag für Anmerkungen

Die extrahierten Daten werden als geführter, mehrstufiger Vorschlag präsentiert und können in den aktuellen Formularpfad übernommen werden.

Das Feature dient ausschließlich der Arbeitserleichterung.

Es ersetzt keine bestehende Validierungs- oder Sicherheitslogik.

## Fachliche Beschreibung

Die Extraktionsfunktion ist in folgenden Kontexten verfügbar:

- Formular **Neuer Kunde** (nur Kundendaten)
- Formular **Neues Projekt**
- Formular **Neuer Termin**

Die Disponentin kann ein PDF in einen definierten Extraktionsbereich ziehen.

Das System:

1. Extrahiert den Text aus dem Dokument.
2. Segmentiert strukturelle Bereiche (Kunde, Artikelliste, Auftragsblock).
3. Extrahiert strukturierte Kundendaten.
4. Extrahiert projektbezogene Informationen wie Auftragsnummer, Auftragssumme, Projekttitel und Auftragsinhalt.
5. Extrahiert eine Artikelliste, sofern sie im Dokument vorhanden ist.
6. Erkennt nach Möglichkeit das Saunamodell oder einen ersten fachlich nutzbaren Projektblock als Projekttitel-Vorschlag.
7. Kategorisiert die Artikelliste semantisch, sofern genügend strukturierte Positionen vorhanden sind.
8. Liefert ein Ergebnis mit erkannten Feldern, Warnungen und Hinweisen zurück.

## Präsentation

Nach erfolgreicher Extraktion erscheint ein geführter Dialog. Der Dialog zeigt je nach Aufrufpfad nur Kundendaten oder zusätzlich Projektdaten.

### Kundenschritt

Der Kundenschritt zeigt erkannte Kundendaten, nicht erkannte Felder und Warnungen. Auffällige Werte, etwa eine formal falsche Postleitzahl, werden als Warnung angezeigt und trotzdem übernommen, solange der Nutzer den Vorschlag bestätigt.

Die Kundenauflösung erfolgt automatisch anhand der Kundennummer. Existiert genau ein Kunde, wird dieser Kunde verknüpft. Bestehende Stammdaten werden nicht still überschrieben. Enthält der extrahierte Datensatz Werte, die im Bestandskunden noch leer sind, bietet der Dialog eine standardmäßig aktive Checkbox an, um nur diese leeren Stammdaten zu ergänzen. Die Checkbox muss deutlich erklären, dass vorhandene Werte unverändert bleiben.

Existiert kein Kunde, wird klar angezeigt, dass beim Übernehmen ein neuer Kunde angelegt wird. Fehlt die Kundennummer oder ist die Auflösung mehrdeutig, blockiert der Dialog die Übernahme und nennt den Grund.

### Projektschritt

Der Projektschritt zeigt Projekttitel, Auftragsnummer, Auftragssumme und Auftragsinhalt als editierbaren Vorschlag. Der extrahierte Dokumenttext kann auf ausdrückliche Auswahl in die Anmerkungen übernommen werden. Vorhandene Anmerkungen werden dabei nicht still überschrieben.

Eine fehlende Artikelliste ist ein Hinweis beziehungsweise Mangel, aber kein Abbruchgrund. Der Nutzer soll die nutzbaren Projektdaten trotzdem übernehmen können. Die Information, dass keine Artikelliste erkannt wurde, dient nur der fachlichen Prüfung und ersetzt keine spätere manuelle Artikellistenpflege.

### Reklamationsschritt

Im Projekt- und Terminpfad kann der Nutzer entscheiden, ob das importierte Dokument als Reklamation behandelt werden soll. Wird dies bejaht, fragt der Dialog direkt im nächsten Schritt, ob eine Reklamationsnotiz vorbereitet werden soll. Bei Zustimmung wird der Notizeditor mit der Vorlage **Reklamation** im selben Dialog eingeblendet. Diese Entscheidung gilt als abgeschlossen und wird beim späteren Speichern nicht erneut abgefragt.

### Abschluss

Der Abschluss zeigt eine knappe Zusammenfassung der übernommenen Daten und bietet an, das importierte PDF in einem Browser-Tab zu öffnen.

### Formular- und Übernahmeführung

Die Dokumentextraktion nutzt das gemeinsame Dialogsystem als geführten Übernahmeprozess. Der Extraktionsdialog zeigt erkannte Kundendaten, Projektdaten, Warnungen und Hinweise als editierbaren Vorschlag. Der Start der Extraktion und die Anzeige des Vorschlags persistieren noch keine fachlichen Projekt- oder Termindaten. Kundendaten werden im Kundenschritt fachlich vollständig aufgelöst: Es wird ein bestehender Kunde verknüpft, ein neuer Kunde zur Anlage vorbereitet oder eine mehrdeutige bzw. fehlende Kundennummer als Blocker angezeigt.

Die Übernahme kopiert bestätigte Extraktionsdaten in das aktuell geöffnete Formular. Im Kontext **Neues Projekt** bleibt das eingelesene PDF danach als Draft-Dokument im Projektformular sichtbar und kann zur manuellen Prüfung in einem neuen Browser-Tab geöffnet werden. Beim späteren Speichern des Projekts werden projektbezogene Entscheidungen wie Artikellistenhinweise, Projekttitel aus Saunamodell oder erstem Projektblock und PDF-Duplikatentscheidung über den Speichern-Review aus [FT (02): Projekte](../ft-02-projekte/ft-02-projekte.md) gebündelt. Eine im Doc-Extract-Dialog bereits vollständig entschiedene Reklamation inklusive Notizfrage erscheint dort nicht erneut.

Im Kontext **Neuer Termin** läuft der Kundendaten- und Projektvorschlagsdialog fachlich gleich wie im Kontext **Neues Projekt**. Nach Übernahme wird das Projektformular im Termin-Kontext geöffnet. Erst nach erfolgreichem Projektspeichern wird das Projekt dem Termin zugeordnet. Terminbezogene Entscheidungen bleiben im Termin-Speichern-Review aus [FT (01): Kalendertermine](../ft-01-kalendertermine/ft-01-kalendertermine.md).

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
- Bei strukturell ungeeigneten Dokumenten bricht der Prozess nur dann ab, wenn weder verwertbare Kundendaten noch verwertbare Projektdaten erkannt werden.
- Die Kundennummer gilt als primärer Schlüssel zur Kundenauflösung.
- Erkannte Bestandskunden werden verknüpft. Leere Stammdaten dürfen nur nach sichtbarer Nutzerentscheidung ergänzt werden; vorhandene Kundendaten werden nicht still überschrieben.
- Fehlende Artikellisten, nicht erkannte optionale Felder und auffällige Feldformate wie eine falsche Postleitzahl werden als Hinweise oder Warnungen gemeldet, dürfen aber die Übernahme der übrigen verwertbaren Daten nicht blockieren.

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
- [UC 21/18: Dokumentextraktion im Formular „Neuer Kunde“ starten](use-cases/uc-21-18-dokumentextraktion-im-formular-neuer-kunde-starten.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
