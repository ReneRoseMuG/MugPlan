# UC 01/06: Tourzuweisung eines Termins entfernen

## Metadaten

- Feature: [FT (01): Kalendertermine](../ft-01-kalendertermine.md)
- Notion-Quelle: https://app.notion.com/p/30dda094354e801f97e0ef2218fbf62c
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Tourzuweisung von einem Termin entfernen, sodass der Termin anschlieÃŸend keiner Tour mehr zugeordnet ist. Beim Entfernen der Tourzuweisung bleiben die bereits am Termin zugeordneten Mitarbeiter unverändert bestehen.

## Vorbedingungen

- Der Termin existiert.
- Der Termin ist einem Kunden zugeordnet.
- Optional: Der Termin ist einem Projekt zugeordnet.
- Der Termin ist aktuell einer Tour zugeordnet.

## Ablauf

1. Der Akteur öffnet den Termin im Terminformular.
2. Der Akteur entfernt die Tourzuweisung.
3. Das System löst die Tourverknüpfung des Termins.
4. Das System verändert die Mitarbeiterliste des Termins nicht. Alle aktuell zugeordneten Mitarbeiter bleiben weiterhin dem Termin zugeordnet.
5. Das System speichert den Termin.
6. Das System aktualisiert die Darstellung in allen relevanten Sichten, insbesondere Kalender- und Listenansichten sowie Tour- und Mitarbeiter-Sichten.

## Alternativen

- Abbruch: Der Akteur bricht den Vorgang ab. Es werden keine Ã„nderungen gespeichert.
- Konflikt beim Speichern: Falls das Speichern fehlschlägt, muss das System sicherstellen, dass weder die Tourverknüpfung noch andere Daten teilweise gespeichert wurden, und eine eindeutige Fehlermeldung anzeigen.

## Ergebnis

Der Termin ist keiner Tour mehr zugeordnet und wird im Kalender nach den Regeln für Termine ohne Tour dargestellt, insbesondere nicht mehr mit Tourfarbe.

Die Mitarbeiterzuordnungen des Termins bleiben unverändert und sind weiterhin konsistent als Einträge in der Join-Tabelle Termin–Mitarbeiter abrufbar. Der Termin ist in der Tour-Terminliste nicht mehr sichtbar. In Mitarbeiter-Terminlisten bleibt der Termin für alle zugeordneten Mitarbeiter sichtbar.

