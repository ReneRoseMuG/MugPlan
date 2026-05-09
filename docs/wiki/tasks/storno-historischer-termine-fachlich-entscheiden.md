# Storno historischer Termine fachlich entscheiden

Die offene Decision zu historischen Storno-Aktionen soll als nachverfolgbare Aufgabe geführt werden. Ziel ist eine fachliche Entscheidung, ob die bestehende Admin-Ausnahme dokumentiert oder der Code auf eine strengere Sperre historischer Termine eingeschränkt werden soll.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Hoch | Kalender/Touren/Abwesenheiten | Planung | 09.05.26 |

---

## Ziel

Die Aufgabe soll den Widerspruch zwischen Spezifikation und bestehendem Rollenverhalten beim Storno historischer Termine klären. Danach muss eindeutig sein, ob Admins historische Termine stornieren dürfen oder ob diese Ausnahme entfällt.

## Ausgangslage

Die Decision W-08 beschreibt eine offene fachliche Abweichung rund um historische Termine. Der Bereich berührt Rollenverhalten, Storno-Workflow, Mitarbeiterabzug, Projektauftragswert und Tag-Setzung.

## Umfang

- Die bestehende fachliche Regel für historische Storno-Aktionen prüfen.
- Die zulässigen Rollen für Sichtbarkeit und Ausführung der Storno-Aktion festlegen.
- Entscheiden, ob Dokumentation, Tests oder Code später angepasst werden müssen.
- Nicht Teil der Aufgabe ist eine direkte Änderung am Storno-Code ohne bestätigte fachliche Entscheidung.

## Umsetzungshinweise

- Betroffene Rollen sind mindestens ADMIN und DISPONENT.
- Eine reine UI-Sichtbarkeit darf nicht als Berechtigungsnachweis gelten.
- Falls die Admin-Ausnahme erhalten bleibt, muss sie in Feature-Doku und Tests sauber dokumentiert werden.
- Falls die Admin-Ausnahme entfällt, muss ein Folgeauftrag für serverseitige Sperre und Regressionstests entstehen.

## Blocker und offene Fragen

- Fachliche Entscheidung zur Admin-Ausnahme steht aus.

---

## Beziehungen

- Features: [FT-01 - Kalendertermine](../features/ft-01-kalendertermine/ft-01-kalendertermine.md)
- Use Cases: UC 01/14 - Historische Termine rollenbasiertes Verhalten · UC 01/22 - Termin stornieren
- Entscheidungen: [W-08 - Storno historischer Termine](../decisions/w-08-storno-historischer-termine.md)
