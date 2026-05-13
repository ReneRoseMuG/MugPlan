# W-08 - Storno historischer Termine: Admin-Ausnahme dokumentiert

## Metadaten

- Status: erledigt
- Priorität: Mittel
- Feature: [FT (01): Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- Entdeckt: 01.05.26
- Art: Widerspruch Code ↔ Spec

## Befund

Der Code erlaubt Admins, auch historische Termine zu stornieren. Die Rollenausnahme ist inzwischen in FT-01 und UC 01/22 dokumentiert.

## Optionen

- A) Spec anpassen: Rollenausnahme für Admin explizit in UC 01/22 aufnehmen
- B) Code einschränken: Storno historischer Termine auch für Admin blockieren

## Auswirkungen eines Eingriffs

Eine Anpassung der Spec legitimiert das bestehende Admin-Verhalten fachlich. Eine Codeeinschränkung würde Admins eine heute mögliche Storno-Aktion nehmen. Betroffen ist nur die Storno-Regel historischer Termine; andere Mutationen historischer Termine sind hiervon nicht automatisch mitentschieden.

## Schadenspotential

Mittel. Ein falscher Entscheid oder eine unklare Doku kann dazu führen, dass Admins Termine unzulässig stornieren oder eine fachlich gewollte Ausnahme verlieren. Das Risiko liegt in Rollen- und Fachregelabweichungen, nicht in einer breiten technischen Instabilität.

## Vorgeschlagene Maßnahme

Erledigt durch Variante A. Die bestehende Admin-Ausnahme bleibt fachlich gültig: Administratoren dürfen historische Termine stornieren, Disponenten nicht. FT-01 und UC 01/22 dokumentieren diese Rollenregel bereits ausdrücklich; eine Codeeinschränkung ist nicht vorgesehen.

## Quelle

## Abschluss

Abgeschlossen am 14.05.26. A-34 wurde geschlossen, weil die fachliche Entscheidung dokumentiert und die Lösung ohne Codeänderung eindeutig ist.
