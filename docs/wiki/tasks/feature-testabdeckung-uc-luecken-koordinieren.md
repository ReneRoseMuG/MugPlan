# Feature-Testabdeckung, UC-Lücken und Präzisierungen koordinieren

Diese Masteraufgabe bündelt Feature-bezogene Testabdeckungs- und Use-Case-Lücken sowie fachliche Präzisierungen als eigenes Projekt. Sie hält fest, welche Einzelaufgaben zum Projekt gehören und welche Abdeckungsebene pro Feature fachlich belastbar geprüft werden muss.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Feature-Testabdeckung | Planung | 09.05.26 |

---

## Ziel

Die Aufgabe soll einen stabilen Koordinationspunkt für wiederkehrende Feature-Testabdeckungsaufgaben, UC-Lücken und fachliche Präzisierungen schaffen. Neue Aufgaben dieses Typs können später dem Projekt zugeordnet werden, ohne bestehende fachliche Themenbereiche in der Aufgabenübersicht umzubenennen.

## Ausgangslage

Bereits mehrere offene Aufgaben betreffen nicht primär neue Produktfunktion, sondern Testlücken, Use-Case-Lücken, Regressionserkennung oder die fachliche Klärung testbarer Regeln. Ohne Projektklammer liegen diese Aufgaben über mehrere Themen verteilt und sind schwer als gemeinsamer Arbeitsstrang erkennbar.

## Umfang

- Die Masteraufgabe führt die Projektklammer für Feature-Testabdeckung, UC-Lücken und fachliche Präzisierungen.
- Die Aufgabe ordnet vorhandene Einzelaufgaben aus FT-01, FT-04, FT-19, FT-26, FT-33 und FT-34 dem Projekt zu.
- Die Aufgabe ordnet passende Präzisierungsaufgaben zu historischen Terminen, systemgesteuerten Termin-Workflows und Termintabellen in Formularen dem Projekt zu.
- Die Aufgabe führt den isolierten Stryker-Test-Runner als verwandte Testinfrastruktur-Aufgabe, ohne daraus einen CI- oder Standard-Testlauf abzuleiten.
- Die Aufgabe hält fest, dass spätere Feature-Testaufgaben ebenfalls hier ergänzt werden können.
- Nicht Teil der Aufgabe ist das Schließen der konkreten Testlücken selbst.
- Nicht Teil der Aufgabe ist eine fachliche Neudefinition von Feature-Verhalten ohne Rücksprache.
- Nicht Teil der Aufgabe sind reine Build-, Cache-, DB-Safety-, Performance- oder konkrete Refactoring-Aufgaben ohne unmittelbare Test-, UC- oder Präzisierungsfunktion.

## Umsetzungshinweise

- Einzelaufgaben müssen echte Datenpfade, Persistenzpfade, API-Flows oder Browser-Flows prüfen, soweit dies fachlich gefordert ist.
- Reine Sichtbarkeitsprüfungen reichen bei Rollen- oder Sicherheitsbezug nicht aus.
- Aufgaben mit Rollenbezug müssen zulässige Rollen, erlaubte Aktionen und serverseitige Durchsetzung ausdrücklich dokumentieren.
- Neue Testaufgaben sollen realistische synthetische Testdaten mit eindeutigen Tokens verwenden.

## Blocker und offene Fragen

- Keine bekannt.

---

## Beziehungen

- Features: FT-01 Kalendertermine · FT-04 Tourenplanung · FT-06 Automatische Regeln · FT-19 Attachments · FT-26 Auswertungen und Reports · FT-33 Abwesenheiten · FT-34 Kalendermarker · Formular- und Detailansichten
- Entscheidungen: [W-08 - Storno historischer Termine](../decisions/w-08-storno-historischer-termine.md) · [W-09 - Systemgesteuerte Termin-Workflows](../decisions/w-09-systemgesteuerte-termin-workflows.md) · [W-11 - Termintabellen in Formularen](../decisions/w-11-termintabellen-in-formularen.md) · [W-16 - Stryker Test Runner](../decisions/w-16-stryker-test-runner.md) · [W-19 - FT-01, FT-04 und FT-33: Testabdeckung und UC-Lücken](../decisions/w-19-ft01-ft04-ft33-testabdeckung-und-uc-luecken.md) · [W-21 - FT-26 Reports: verbleibende Testabdeckung](../decisions/w-21-ft26-reports-testabdeckung.md)
- Weitere Bezüge: [Feature-Testabdeckung, UC-Lücken und Präzisierungen](../projects/feature-testabdeckung-uc-luecken.md)
