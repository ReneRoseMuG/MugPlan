# implementation-index.md

Kurzindex für `docs/implementation.md` — Volldatei nur lesen wenn Index darauf verweist.

## Wann welchen Abschnitt lesen

| Abschnitt | Inhalt | Lesen bei |
|---|---|---|
| 2 | Runtime- und Env-Regeln | Env-Variablen, DB-Verbindung, Startverhalten |
| 3 | Contract-First und Schichten | Neuen Endpunkten, Schichtänderungen |
| 5.1 | Termine und Overlap | Termin-Mutations, Mitarbeiter-Zuweisungen |
| 7 | Sicherheitsgates für destruktive Operationen | Admin-Reset, Purge, DB-Guards |
| 8 | Testarchitektur | Neue Tests, Test-Setup, Fixtures |
| 10 | Implementierungsregeln | Vor jeder Codeänderung als Checkliste |
| 11 | Bekannte technische Hinweise | Encoding-Probleme, historische Termine |
| Sichtbarkeit | Rollenabhängige Filter (Schutzregel) | Rollen, Sichtbarkeit, Filter-Logik |

## Niemals nötig bei
- Einfachen Fragen ohne Codeänderung
- Reinen Git-Operationen  
- Tippfehler-Fixes oder rein kosmetischen Änderungen

## Vollständige Datei lesen wenn
- Neues Feature über mehrere Schichten
- Sicherheits- oder Auth-relevante Änderungen
- Test-Setup oder Testarchitektur betroffen
- Schutzregel-Abschnitt (Rollen/Sichtbarkeit) relevant

## Schnellcheck vor jedem Task
1. Ist es eine reine Frage? → Kein Dokument nötig
2. Ist es ein isolierter Fix in einer Datei? → Nur Abschnitt 10 (Checkliste)
3. Berührt es API/Schichten? → Abschnitt 3
4. Berührt es Termine/Mitarbeiter? → Abschnitt 5.1
5. Sonst → gezielt per Index entscheiden