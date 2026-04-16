# Log: Auslastung-Kalender Layout – Fehlversuch

**Datum:** 2026-04-16  
**Branch:** mitarbeiter-auslastung-tab  
**Status:** Abgebrochen, alle Änderungen rückgängig gemacht

---

## Auftrag

Formular Mitarbeiter → Tab Auslastung: Das Kalenderblatt liegt stark nach unten versetzt. Es sollte direkt unter dem Tab-Balken liegen und genau vier Wochen darstellen.

---

## Was passiert ist

Ca. 15 Minuten reine CSS-Analyse ohne produktives Ergebnis. Danach drei Änderungen die einen Fehler eingebracht und sofort rückgängig gemacht wurden:

1. `EmployeeUtilizationView.tsx`: `relative/absolute/inset-0`-Wrapper durch `min-h-0 flex-1 overflow-hidden` ersetzt.
2. `EmployeeForm.tsx`: `space-y-4` im Inner-Tabs für Auslastung-Tab deaktiviert.
3. `EmployeeForm.tsx`: `!mt-0` auf `TabsContent[auslastung]` gesetzt.

Resultat: Tab-Inhalt verschwunden. Alle drei Änderungen sofort zurückgesetzt.

---

## Ursache des Scheiterns

- Zu viel theoretische CSS-Analyse (Flex-Ketten, `h-full`-Auflösung, `overflow-y-auto`-Containing-Block), ohne im Browser zu verifizieren welches Element tatsächlich das Problem verursacht.
- Änderungen ohne Browser-DevTools-Diagnose vorgenommen.
- Kein Verständnis davon, warum das Tab nach den Änderungen verschwand – Ursache ungeklärt.

---

## Offener Stand

Das ursprüngliche Problem besteht weiterhin unverändert:
- `EmployeeUtilizationView` zeigt ca. 350px Leerraum zwischen Tab-Balken und NavBar.
- Ursache im CSS-Layout noch nicht eindeutig diagnostiziert.

## Was als nächstes nötig wäre

Browser-DevTools öffnen, Element-Inspector auf das `employee-utilization-view`-Element anwenden und die tatsächlich berechneten Höhen und Positionen ablesen. Erst dann gezielt den richtigen Eingriffspunkt finden.
