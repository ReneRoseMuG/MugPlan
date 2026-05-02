# FT (32): Aktive Änderungsbenachrichtigung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature
- Notion-Quelle: https://app.notion.com/p/337da094354e81c09d0bc94c1b789398
- Importquelle lokal: `C:/Users/schro/Desktop/FT (32) Aktive Änderungsbenachrichtigung 337da094354e81c09d0bc94c1b789398.md`
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Ziel / Zweck

Dieses Feature stellt sicher, dass angemeldete Benutzer proaktiv informiert werden, wenn Daten, die sie gerade betrachten oder bearbeiten, durch einen anderen Benutzer verändert wurden. Es ergänzt das in NFR (01) beschriebene Optimistic Locking um eine aktive, nicht-blockierende Benachrichtigungskomponente.

## Fachliche Beschreibung

Das System baut für jede angemeldete Session eine persistente Server-Push-Verbindung (SSE) auf. Sobald eine mutierende Operation erfolgreich abgeschlossen wird, sendet der Server ein Ereignis an alle anderen verbundenen Sessions.

Der Client wertet eingehende Ereignisse aus und setzt bei Eingang einer relevanten Fremdänderung einen globalen Status „Updates verfügbar“. Die Benachrichtigung wird als globaler, nicht-blockierender und länger sichtbarer Toast dargestellt. Der Toast enthält keinen eigenen Aktualisieren-Button, sondern verweist auf die zentrale Funktion „Neu laden“ in der Hauptnavigation.

Die Aktualisierung erfolgt bewusst zentral über die Hauptnavigation. Wird „Neu laden“ ausgelöst, sollen alle offenen, refresh-fähigen Ansichten der aktuellen Session aktualisiert werden. Dazu zählen die Hauptansicht und zusätzlich geöffnete Tabs innerhalb derselben App-Session.

Die Funktion „Neu laden“ darf nur ausgelöst werden, wenn in der aktuellen Session kein Edit-Form geöffnet ist. Solange ein Edit-Form geöffnet ist, ist die zentrale Aktualisierung gesperrt.

Mehrere eingehende Fremdänderungen führen nicht zu einer Kette einzelner Meldungen. Solange der Status „Updates verfügbar“ aktiv ist, bleibt der Toast sichtbar und weitere Ereignisse halten diesen Zustand lediglich aufrecht.

Die Benachrichtigung ist ein Komfortmechanismus. Laufende Bearbeitungen werden nicht automatisch überschrieben. Der Versionskonflikt beim Speichern gemäß NFR (01) Abschnitt 3.5 bleibt die harte, nicht umgehbare Absicherung.

## Regeln & Randbedingungen

- Die auslösende Session erhält keine Benachrichtigung über ihre eigenen Änderungen.
- Die Benachrichtigung ist nicht-blockierend: laufende Bearbeitungen werden nicht automatisch überschrieben.
- Die Benachrichtigung wird als globaler, länger sichtbarer Toast dargestellt.
- Mehrere eingehende Fremdänderungen erzeugen keine gestapelten Einzelmeldungen, sondern halten lediglich den Status „Updates verfügbar“ aktiv.
- Die Aktualisierung erfolgt zentral über die Funktion „Neu laden“ in der Hauptnavigation.
- Die Funktion „Neu laden“ aktualisiert alle offenen, refresh-fähigen Ansichten der aktuellen Session, einschließlich Hauptansicht und geöffneter Tabs.
- Die Funktion „Neu laden“ darf nur verfügbar oder ausführbar sein, wenn in der aktuellen Session kein Edit-Form geöffnet ist.
- Solange ein Edit-Form geöffnet ist, ist die zentrale Aktualisierung gesperrt.
- Ansichten mit offenem Bearbeitungszustand oder ungespeicherten Änderungen dürfen durch die globale Aktualisierung nicht still überschrieben werden.
- Bei Verbindungsunterbrechung liefert der Server beim Reconnect alle verpassten Ereignisse nach (Last-Event-ID-Mechanismus).
- Das `change_log` dient sowohl als Auslöser für SSE-Ereignisse als auch als Lückenfüller nach Verbindungsunterbrechungen.
- Alle mutierenden Operationen auf Kernentitäten lösen einen `change_log`-Eintrag aus. Lesevorgänge werden nicht geloggt.

## Abhängigkeiten

- NFR (01): Multi-User-Konsistenz – definiert den technischen Rahmen (Abschnitt 3.5)

## Use Cases

- [UC 32/01: SSE-Verbindung aufbauen](use-cases/uc-32-01-sse-verbindung-aufbauen.md)
- [UC 32/02: Änderungsereignis empfangen und Hinweis anzeigen](use-cases/uc-32-02-aenderungsereignis-empfangen-und-hinweis-anzeigen.md)
- [UC 32/03: Verbindung nach Unterbrechung wiederherstellen](use-cases/uc-32-03-verbindung-nach-unterbrechung-wiederherstellen.md)
- [UC 32/04: Session-Ende – Verbindung schließen](use-cases/uc-32-04-session-ende-verbindung-schliessen.md)

## Backlogs

Nicht angegeben in der Notion-Quelle.

## Architektur & Kontext

Nicht angegeben in der Notion-Quelle.

## Entscheidungen & Offene Punkte

Nicht angegeben in der Notion-Quelle.
