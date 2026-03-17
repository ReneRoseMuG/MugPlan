# architecture-index.md

Kurzindex für `docs/architecture.md` — Volldatei nur lesen wenn Index darauf verweist.

## Wann welchen Abschnitt lesen

| Abschnitt | Inhalt | Lesen bei |
|---|---|---|
| 3 | Architekturprinzipien: Contract-First, Schichtmodell, Server als Wahrheit | Neuen Endpunkten, Schichtverletzungen, Frontend/Backend-Entscheidungen |
| 5 | Rollen- und Zugriffsarchitektur | Auth, Rollen, Berechtigungen |
| 7 | Fachliche Invarianten: Overlap, historische Sperre, Aktivflags | Termin-Mutationen, Mitarbeiter-Zuweisungen, Stammdaten |
| 10 | Erweiterungspunkte | Neuen Features, neuen Entitäten |
| 11 | Bekannte Risiken | Encoding-Themen, historische Termine |

## Niemals nötig bei
- Einfachen Fragen ohne Codeänderung
- Reinen Git-Operationen
- Fixes innerhalb einer einzelnen Datei ohne Architekturberührung

## Vollständige Datei lesen wenn
- Unklar ist welcher Abschnitt zutrifft
- Task mehrere Schichten oder Domänen berührt
- Neue Domäne oder neues Feature angelegt wird