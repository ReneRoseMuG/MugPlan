# FT (11): Team Verwaltung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Teams ermöglichen der Disposition, häufig verwendete Mitarbeiterkombinationen schnell und konsistent auf Termine anzuwenden. Ziel ist es, die Mitarbeiterzuweisung zu beschleunigen, ohne die Terminplanung fachlich zu verändern oder zu verkomplizieren.

## Fachliche Beschreibung

Teams sind **reine Dispositionshilfen**. Ein Team besteht aus einer Bezeichnung und einer Liste aktiver Mitarbeiter. Sie kann beim Anlegen oder Bearbeiten eines Termins ausgewählt werden; das System übernimmt dann die enthaltenen Mitarbeiter **als Vorschlag** in die Mitarbeiterzuweisung des Termins.

Am Termin selbst wird **immer die konkrete Mitarbeiterliste** gespeichert, nicht das Team. Änderungen an Teams wirken sich **nicht rückwirkend** auf bestehende oder vergangene Termine aus. Teams besitzen **keine Historie** und haben **keine fachliche Bedeutung** über die Vereinfachung der Eingabe hinaus.

Teams können unabhängig von Terminen existieren. Sie dürfen ausschließlich **aktive Mitarbeiter** enthalten. Beim Anwenden eines Teams ist eindeutig festzulegen, ob die Mitarbeiter **ersetzt** oder **hinzugefügt** werden; die Entscheidung ist systemweit konsistent umzusetzen.

## Regeln & Randbedingungen

- Teams sind **nicht** direkt mit Terminen verknüpft.
- Gespeichert wird am Termin stets die **konkrete Mitarbeiterzuweisung**.
- Änderungen an Teams wirken **nicht rückwirkend**.
- Teams enthalten **nur aktive Mitarbeiter**.
- Ein Termin kann mehrere Mitarbeiter haben; die Mitarbeiterzuweisung ist optional.
- Teams besitzen **keine Historie** und **keinen Status**.
- Teams können ohne Bezug zu Terminen existieren.
- Ein Mitarbeiter darf zu einem Zeitpunkt nur genau einem Team zugeordnet sein.
- Eine Teamzuweisung ist nur zulässig, wenn der Mitarbeiter keinem anderen Team zugeordnet ist.
- Bei paralleler Zuweisung entscheidet das System deterministisch durch serverseitige Validierung (409 bei Konflikt).

## Use Cases

- [UC 11/01: Team anlegen](use-cases/uc-11-01-team-anlegen.md)
- [UC 11/02: Team bearbeiten](use-cases/uc-11-02-team-bearbeiten.md)
- [UC 11/02: Team bearbeiten](use-cases/uc-11-02-team-bearbeiten.md)
- [UC 11/03: Team löschen](use-cases/uc-11-03-team-loeschen.md)
- [UC 11/04: Team anzeigen](use-cases/uc-11-04-team-anzeigen.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
