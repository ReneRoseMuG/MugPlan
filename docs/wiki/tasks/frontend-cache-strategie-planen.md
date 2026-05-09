# App-weite Frontend-Cache-Strategie planen

Die offene Decision zur React-Query-Cache-Strategie soll als Aufgabe geführt werden. Ziel ist eine gestufte, fachdomänenbezogene Cache- und Invalidierungsstrategie statt eines pauschalen globalen Umbaus.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Frontend-Cache | Planung | 09.05.26 |

---

## Ziel

Die Aufgabe soll eine kontrollierbare Frontend-Cache-Strategie vorbereiten. Volatile Daten sollen gezielter aktualisiert werden, während stabile Hilfsdaten weiterhin effizient gecacht bleiben können.

## Ausgangslage

W-10 beschreibt stale Daten als app-weites Risiko. Besonders sensibel sind Kalender, Terminlisten, Reports, Stammdatenlisten und Standalone-Ansichten.

## Umfang

- Bestehende Query-Keys und Invalidierungsmuster fachdomänennah inventarisieren.
- Volatile Listen und stabile Hilfsdaten voneinander abgrenzen.
- Einen Vorschlag für zentrale Invalidierungshelfer und Refetch-Grenzen vorbereiten.
- Nicht Teil der Aufgabe ist ein pauschales Entfernen von `staleTime: Infinity` ohne Folgeanalyse.

## Umsetzungshinweise

- Rollen und Berechtigungen dürfen durch frischere Refetches nicht aufgeweicht werden.
- Serverantworten bleiben die maßgebliche Quelle für zulässige Daten.
- Kalender- und Reportpfade brauchen besondere Regressionstests, falls daraus eine spätere Umsetzung entsteht.
- Cross-Tab- und Change-Notification-Verhalten ist als angrenzender Pfad mitzudenken.

## Blocker und offene Fragen

- Die fachdomänenspezifischen Grenzen der Cache-Helfer sind noch zu bestimmen.

---

## Beziehungen

- Features: App-weite Datenaktualisierung · Frontend-Architektur
- Entscheidungen: [W-10 - Frontend-Cache-Strategie](../decisions/w-10-frontend-cache-strategie.md)
