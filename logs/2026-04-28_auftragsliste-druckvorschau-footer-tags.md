# Auftragslog: Auftragsliste Druckvorschau Footer-Tags

## Zweck

In der Druckvorschau der Auftragsliste sollte die Tag-Zeile im Footer nicht unnötig umbrechen. Die rechte Footer-Spalte mit Mitarbeiter-, Notiz- und Anhang-Badges sollte deshalb nur in der Druckvorschau ausgeblendet werden, damit die Tags die volle Footer-Breite nutzen können.

## Scope

- rechte Footer-Spalte der Auftragslisten-Druckvorschau ausblenden
- normale Auftragslisten-Reportkarte unverändert lassen
- gezielte Wiring-Tests für normale Karte und Druckvorschau anpassen

## Technische Entscheidungen

- Die gemeinsame `ReportProjectCard` erhielt einen optionalen Schalter, um die rechte Footer-Badge-Spalte gezielt auszublenden.
- Die Auftragslisten-Druckvorschau aktiviert diesen Schalter explizit in `AuftragslistePrintLayout`.
- Die normale Report-Ansicht der Auftragsliste bleibt unverändert und zeigt die Hover-/Badge-Spalte weiterhin an.

## Betroffene Dateien

- `client/src/components/reports/ReportProjectCard.tsx`
- `client/src/components/reports/AuftragslisteProjectCard.tsx`
- `client/src/components/reports/AuftragslistePrintLayout.tsx`
- `tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`

## Hinweise zum Testen

Erfolgreich ausgeführt:

- `npm run test:unit -- tests/unit/ui/auftragslisteProjectCard.wiring.test.tsx tests/unit/ui/auftragslistePrintLayout.wiring.test.tsx`

## Bekannte Einschränkungen

- Die Ausblendung der rechten Footer-Spalte ist bewusst nur für die Auftragslisten-Druckvorschau aktiv und wurde nicht auf andere Reports oder die normale Auftragslisten-Ansicht übertragen.
