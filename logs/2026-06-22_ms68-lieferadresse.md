# MS-68 — Adressverwaltung: wirksame Lieferadresse in allen Konsumenten

Datum: 22.06.26
Branch: `feat/ms68-adressverwaltung-lieferadresse` (von `work`)

## Was erledigt wurde

Kunden können jetzt neben der Rechnungsadresse eine abweichende Lieferadresse (und weitere
Adressen mit Kategorie) führen. Das System löst je Kunde eine **wirksame Lieferadresse** auf:
existiert eine Lieferadresse, gilt diese; sonst die Rechnungsadresse als Fallback. Diese
wirksame Lieferadresse wird überall dort gezeigt, wo bisher die Kundenadresse stand —
Terminkarten der Wochenübersicht, Kundenkarten/-listen, Hover-Previews, Reports (Vorlaufliste,
Produktionsplanung, Tourenplan-Druck), Projekt-Board und Export. Ohne abweichende Lieferadresse
bleibt die Anzeige unverändert (Rechnungsadresse).

Im Kundenformular wird die Rechnungsadresse wie bisher bearbeitet. Direkt darunter gibt es einen
neuen Bereich „Lieferadresse & weitere Adressen" zum Anlegen, Ändern und Entfernen der
abweichenden Lieferadresse. Änderungen wirken sofort: die betroffenen Ansichten zeigen nach der
nächsten Aktualisierung den neuen Stand.

## Wichtige Entscheidungen und Einschränkungen

- **Anzeige-Form bleibt gleich:** Geändert wurde nur die Herkunft der Adressdaten (serverseitige
  Auflösung), nicht die Darstellung. Dadurch mussten die vielen Anzeige-Komponenten nicht
  umgebaut werden und zeigen automatisch die wirksame Lieferadresse.
- **Rechnungsadresse bleibt das Kundenformular-Feld** und wird intern zusätzlich als Adresszeile
  gespiegelt, damit Formular und Auflösung konsistent bleiben.
- **Schutzregeln:** Die Rechnungsadresse kann nicht entfernt werden (ein Kunde bleibt nie ohne
  Rechnungsadresse); die Pflichtkategorien Rechnungs-/Lieferadresse sind geschützt; Schreibrechte
  nur für Disponent/Admin, Leser nur lesend; Katalogpflege ist Admin-only.
- **Folgeschritte (bewusst offen):** eine eigene Admin-Oberfläche zum Pflegen des
  Adresskategorie-Katalogs (Backend ist fertig) sowie ein expliziter Reports-Integrationstest
  (Reports nutzen denselben, bereits geprüften Resolver).

## Durchgeführte Prüfungen und Tests

- Schemamigration auf Dev erfolgreich gelaufen (Status „synchron"); Test-Basis-DB mit den neuen
  Tabellen und Pflichtkategorien versorgt (Test-DBs werden im Projekt per Schema-Klon
  bereitgestellt, nicht über die Migrationskette).
- Neuer Integrationstest für die Adressverwaltung (Auflösung, Ausschluss der Rechnungsadresse,
  Reaktion auf Änderung/Entfernen, Optimistic Locking, Validierung, Schutzregeln) — grün.
- Neue Browsertests: Terminkarte und Kundenkarte zeigen die wirksame Lieferadresse statt der
  Rechnungsadresse; Setzen der Lieferadresse im Formular wirkt sofort auf die Terminkarte — grün.
- Regressionsläufe (Kalender-Kontaktfelder, Entity-Card-Payloads für Termine/Projekte/Kunden,
  Vorlaufliste, Produktionsplanung, Kunden-Liste/Create/Sichtbarkeit) — grün.
- Voller statischer Audit grün: `check` (Encoding/Typen), `lint`, `audit` (0 Schwachstellen),
  `secrets` (keine Funde).

## Was der Nutzer erwarten kann

In der App lässt sich pro Kunde eine abweichende Lieferadresse hinterlegen. Sobald sie gesetzt
ist, zeigen alle adressdarstellenden Ansichten diese Lieferadresse; ohne sie greift die
Rechnungsadresse. Änderungen sind nach der nächsten Aktualisierung der jeweiligen Ansicht
sichtbar.

## Hinweis

Ein vollständiger Testlauf über alle Suiten (Unit/Integration/E2E/Browser) wurde noch nicht
ausgeführt; geprüft wurden gezielt die betroffenen Bereiche. Auf Wunsch kann der volle Testlauf
nachgezogen werden.
