# Termintabellen in Formularen vereinheitlichen

Die offene Decision zu Terminlisten in Formular- und Detailansichten soll als Aufgabe geführt werden. Ziel ist eine fachlich und UX-seitig bewusste Entscheidung, ob Kunden- und Projektformulare stärker an die Terminlistenmuster von Touren und Mitarbeitern angeglichen werden sollen.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Mittel | Formularansichten | Planung | 09.05.26 |

---

## Ziel

Die Aufgabe soll eine klare Umsetzungsentscheidung für Termintabellen in Formularen vorbereiten. Danach soll feststehen, ob der Status quo bleibt, ob Kunden und Projekte eigene Haupttabs erhalten oder ob ein gemeinsames Terminlistenmuster abgeleitet wird.

## Ausgangslage

W-11 beschreibt unterschiedliche Termin-Darstellungen in Kunden-, Projekt-, Tour- und Mitarbeiterformularen. Dadurch entstehen Sonderpfade für Darstellung, Navigation, Vorschau und Tests.

## Umfang

- Bestehende Terminlistenvarianten in Formularen fachlich vergleichen.
- Auswirkungen auf UX, Navigation, Fokuswege und Tests dokumentieren.
- Prüfen, welche Variante ohne fachliche Rollen- oder API-Änderung umsetzbar wäre.
- Nicht Teil der Aufgabe ist eine direkte UI-Umgestaltung ohne bestätigte Variante.

## Umsetzungshinweise

- Rollen, Berechtigungen und serverseitige Terminlogik sollen unverändert bleiben.
- Der spätere Eingriff liegt voraussichtlich in Informationsarchitektur, Layout und Frontend-Verkabelung.
- Browser-Tests müssen geänderte Öffnungswege, Fokusführung und Terminlistenverhalten abdecken.

## Blocker und offene Fragen

- Die Zielvariante für Kunden- und Projektformulare ist noch nicht freigegeben.

---

## Beziehungen

- Features: Formular- und Detailansichten für Kunden, Projekte, Touren und Mitarbeiter
- Entscheidungen: [W-11 - Termintabellen in Formularen vereinheitlichen](../decisions/w-11-termintabellen-in-formularen.md)
