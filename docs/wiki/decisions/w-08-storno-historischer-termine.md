# W-08 - Storno historischer Termine: Admin-Ausnahme undokumentiert

## Metadaten

- Status: offen
- Priorität: Mittel
- Feature: [FT (01): Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- Entdeckt: 01.05.26
- Art: Widerspruch Code ↔ Spec

## Befund

Der Code erlaubt Admins, auch historische Termine zu stornieren. Der betroffene Use Case beschreibt die Rollenausnahme nicht eindeutig.

## Optionen

- A) Spec anpassen: Rollenausnahme für Admin explizit in UC 01/22 aufnehmen
- B) Code einschränken: Storno historischer Termine auch für Admin blockieren

## Auswirkungen eines Eingriffs

Eine Anpassung der Spec würde das bestehende Admin-Verhalten fachlich legitimieren. Eine Codeeinschränkung würde Admins eine heute mögliche Storno-Aktion nehmen. Betroffen ist nur die Storno-Regel historischer Termine; andere Mutationen historischer Termine sind hiervon nicht automatisch mitentschieden.

## Schadenspotential

Mittel. Ein falscher Entscheid oder eine unklare Doku kann dazu führen, dass Admins Termine unzulässig stornieren oder eine fachlich gewollte Ausnahme verlieren. Das Risiko liegt in Rollen- und Fachregelabweichungen, nicht in einer breiten technischen Instabilität.

## Vorgeschlagene Maßnahme

Entscheidung treffen: Spec an Admin-Ausnahme anpassen oder Code einschränken.

## Quelle
