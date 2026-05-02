# W-07 - Historische Termine: Admin-Ausnahme undokumentiert

## Metadaten

- Status: offen
- PrioritÃ¤t: Mittel
- Feature: [FT (01): Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- Entdeckt: 01.05.26
- Art: Widerspruch Code â†” Spec

## Befund

Der Code erlaubt Admins, historische Termine zu bearbeiten und zu lÃ¶schen. Die Spec enthÃ¤lt fÃ¼r vergangene Termine keine eindeutige Rollenausnahme.

## Optionen

- A) Spec anpassen: Admin-Ausnahme fÃ¼r historische Termine explizit in FT-01-Regeln und UC 01/14 aufnehmen
- B) Code einschrÃ¤nken: Admin-Ausnahme entfernen, historische Termine fÃ¼r alle Rollen sperren

## Auswirkungen eines Eingriffs

Eine Anpassung der Spec wÃ¼rde den aktuellen Code nachtrÃ¤glich fachlich absichern. Eine EinschrÃ¤nkung im Code wÃ¼rde dagegen bestehendes Verhalten fÃ¼r Admins sichtbar Ã¤ndern. Betroffen ist die Rollenregel rund um historische Termine; andere Terminpfade sollen unverÃ¤ndert bleiben.

## Schadenspotential

Mittel. Wenn die Entscheidung falsch dokumentiert oder falsch umgesetzt wird, kÃ¶nnen Rollen unbeabsichtigt mehr oder weniger Rechte auf historische Termine erhalten. Das betrifft fachliche Korrektheit und Rollenklarheit, aber nicht breit die restliche Terminlogik.

## Vorgeschlagene MaÃŸnahme

Entscheidung treffen: Spec um Admin-Ausnahme ergÃ¤nzen oder Code auf pauschale Sperre historischer Termine Ã¤ndern.

## Quelle

https://app.notion.com/p/352da094354e802f98cdf0f824251d52

