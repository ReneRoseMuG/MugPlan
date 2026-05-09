# Feature-Testabdeckung und UC-Lücken koordinieren

Diese Masteraufgabe bündelt Feature-bezogene Testabdeckungs- und Use-Case-Lücken als eigenes Projekt. Sie hält fest, welche Einzelaufgaben zum Projekt gehören und welche Abdeckungsebene pro Feature fachlich belastbar geprüft werden muss.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Feature-Testabdeckung | Planung | 09.05.26 |

---

## Ziel

Die Aufgabe soll einen stabilen Koordinationspunkt für wiederkehrende Feature-Testabdeckungsaufgaben schaffen. Neue Aufgaben dieses Typs können später dem Projekt zugeordnet werden, ohne bestehende fachliche Themenbereiche in der Aufgabenübersicht umzubenennen.

## Ausgangslage

Bereits mehrere offene Aufgaben betreffen nicht primär neue Produktfunktion, sondern Testlücken, Use-Case-Lücken oder Regressionserkennung einzelner Features. Ohne Projektklammer liegen diese Aufgaben über mehrere Themen verteilt und sind schwer als gemeinsamer Arbeitsstrang erkennbar.

## Umfang

- Die Masteraufgabe führt die Projektklammer für Feature-Testabdeckung und UC-Lücken.
- Die Aufgabe ordnet vorhandene Einzelaufgaben aus FT-01, FT-04, FT-19, FT-26, FT-33 und FT-34 dem Projekt zu.
- Die Aufgabe hält fest, dass spätere Feature-Testaufgaben ebenfalls hier ergänzt werden können.
- Nicht Teil der Aufgabe ist das Schließen der konkreten Testlücken selbst.
- Nicht Teil der Aufgabe ist eine fachliche Neudefinition von Feature-Verhalten ohne Rücksprache.

## Umsetzungshinweise

- Einzelaufgaben müssen echte Datenpfade, Persistenzpfade, API-Flows oder Browser-Flows prüfen, soweit dies fachlich gefordert ist.
- Reine Sichtbarkeitsprüfungen reichen bei Rollen- oder Sicherheitsbezug nicht aus.
- Aufgaben mit Rollenbezug müssen zulässige Rollen, erlaubte Aktionen und serverseitige Durchsetzung ausdrücklich dokumentieren.
- Neue Testaufgaben sollen realistische synthetische Testdaten mit eindeutigen Tokens verwenden.

## Blocker und offene Fragen

- Keine bekannt.

---

## Beziehungen

- Features: FT-01 Kalendertermine · FT-04 Tourenplanung · FT-19 Attachments · FT-26 Auswertungen und Reports · FT-33 Abwesenheiten · FT-34 Kalendermarker
- Entscheidungen: [W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken](../decisions/w-19-ft01-ft04-ft33-testabdeckung-und-uc-luecken.md) · [W-21 - FT-26 Reports: verbleibende Testabdeckung](../decisions/w-21-ft26-reports-testabdeckung.md)
- Weitere Bezüge: [Feature-Testabdeckung und UC-Lücken](../projects/feature-testabdeckung-uc-luecken.md)
