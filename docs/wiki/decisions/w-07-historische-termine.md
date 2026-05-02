# W-07 - Historische Termine: Admin-Ausnahme undokumentiert

## Metadaten

- Status: offen
- Priorität: Mittel
- Feature: [FT (01): Kalendertermine](../features/ft-01-kalendertermine/feature.md)
- Entdeckt: 01.05.26
- Art: Widerspruch Code ↔ Spec

## Befund

Der Code erlaubt Admins, historische Termine zu bearbeiten und zu löschen. Die Spec enthält für vergangene Termine keine eindeutige Rollenausnahme.

## Optionen

- A) Spec anpassen: Admin-Ausnahme für historische Termine explizit in FT-01-Regeln und UC 01/14 aufnehmen
- B) Code einschränken: Admin-Ausnahme entfernen, historische Termine für alle Rollen sperren

## Auswirkungen eines Eingriffs

Eine Anpassung der Spec würde den aktuellen Code nachträglich fachlich absichern. Eine Einschränkung im Code würde dagegen bestehendes Verhalten für Admins sichtbar ändern. Betroffen ist die Rollenregel rund um historische Termine; andere Terminpfade sollen unverändert bleiben.

## Schadenspotential

Mittel. Wenn die Entscheidung falsch dokumentiert oder falsch umgesetzt wird, können Rollen unbeabsichtigt mehr oder weniger Rechte auf historische Termine erhalten. Das betrifft fachliche Korrektheit und Rollenklarheit, aber nicht breit die restliche Terminlogik.

## Vorgeschlagene Maßnahme

Entscheidung treffen: Spec um Admin-Ausnahme ergänzen oder Code auf pauschale Sperre historischer Termine ändern.

## Quelle

https://app.notion.com/p/352da094354e802f98cdf0f824251d52
