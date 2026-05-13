# Systemgesteuerte Termin-Workflows gezielt generalisieren

Die offene Decision zu systemgesteuerten Termin-Workflows soll als Aufgabe nachverfolgt werden. Der Fokus liegt auf einer kleinen, serverseitigen Generalisierung wiederkehrender Termin-/Tag-Muster, ohne eine große Regel-Engine einzuführen.

| Status | Dringlichkeit | Thema | Typ | Erstellt |
| :--- | :--- | :--- | :--- | :--- |
| `offen` | Mittel | Termin-Workflows | Analyse | 09.05.26 |

---

## Ziel

Die Aufgabe soll prüfen, ob wiederkehrende Muster aus systemgesteuerten Termin-Workflows in einem kleinen gemeinsamen Kern zusammengeführt werden können. Das Ergebnis soll eine belastbare Entscheidungs- und Umsetzungsvorlage sein.

## Ausgangslage

W-09 beschreibt verteilte Regeln rund um Systemkontext, geschützte Workflow-Tags, Mutation-Events und Folgeaktionen. Betroffen sind insbesondere automatische Regeln und Abwesenheits- beziehungsweise Personalplanungsflüsse.

## Umfang

- Bestehende systemgesteuerte Termin- und Tag-Workflows identifizieren.
- Gemeinsame Muster und bewusst zu trennende Spezialfälle dokumentieren.
- Prüfen, welche serverseitigen Guards, Rollenprüfungen und Nebenwirkungen erhalten bleiben müssen.
- Nicht Teil der Aufgabe ist die Einführung einer allgemeinen Regel-Engine.

## Umsetzungshinweise

- Betroffene Fachbereiche sind FT-06 Automatische Regeln und FT-33 Abwesenheiten.
- Rollen- und Sicherheitsgrenzen müssen serverseitig geprüft bleiben.
- Geschützte Workflow-Tags dürfen nicht durch generische Tag-Pflege umgangen werden.
- Eine spätere Umsetzung darf bestehende Terminmutationen nicht stillschweigend auf andere Workflows ausweiten.

## Blocker und offene Fragen

- Die konkrete Grenze zwischen kleinem Workflow-Kern und bewusst getrennten Spezialfällen ist noch festzulegen.

---

## Beziehungen

- Features: FT-06 Automatische Regeln · FT-33 Abwesenheiten
- Entscheidungen: [W-09 - Systemgesteuerte Termin-Workflows gezielt generalisieren](../decisions/w-09-systemgesteuerte-termin-workflows.md)
- Weitere Bezüge: [Feature-Testabdeckung, UC-Lücken und Präzisierungen](../projects/feature-testabdeckung-uc-luecken.md)
