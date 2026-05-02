# W-08 - Storno historischer Termine: Admin-Ausnahme undokumentiert

## Metadaten

- Status: offen
- PrioritÃ¤t: Mittel
- Feature: [FT (01): Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- Entdeckt: 01.05.26
- Art: Widerspruch Code â†” Spec

## Befund

Der Code erlaubt Admins, auch historische Termine zu stornieren. Der betroffene Use Case beschreibt die Rollenausnahme nicht eindeutig.

## Optionen

- A) Spec anpassen: Rollenausnahme fÃ¼r Admin explizit in UC 01/22 aufnehmen
- B) Code einschrÃ¤nken: Storno historischer Termine auch fÃ¼r Admin blockieren

## Auswirkungen eines Eingriffs

Eine Anpassung der Spec wÃ¼rde das bestehende Admin-Verhalten fachlich legitimieren. Eine CodeeinschrÃ¤nkung wÃ¼rde Admins eine heute mÃ¶gliche Storno-Aktion nehmen. Betroffen ist nur die Storno-Regel historischer Termine; andere Mutationen historischer Termine sind hiervon nicht automatisch mitentschieden.

## Schadenspotential

Mittel. Ein falscher Entscheid oder eine unklare Doku kann dazu fÃ¼hren, dass Admins Termine unzulÃ¤ssig stornieren oder eine fachlich gewollte Ausnahme verlieren. Das Risiko liegt in Rollen- und Fachregelabweichungen, nicht in einer breiten technischen InstabilitÃ¤t.

## Vorgeschlagene MaÃŸnahme

Entscheidung treffen: Spec an Admin-Ausnahme anpassen oder Code einschrÃ¤nken.

## Quelle

https://app.notion.com/p/352da094354e802f98cdf0f824251d52

