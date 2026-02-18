# Test Index

Stand: 18.02.2026

## Technical

- [multi-user](technical/multi-user.md)
- [transactions](technical/transactions.md)
- [visibility-access](technical/visibility-access.md)
- [test-isolation](technical/test-isolation.md)

## Domain

- [termin](domain/termin.md)
- [projekt](domain/projekt.md)
- [mitarbeiter](domain/mitarbeiter.md)
- [team](domain/team.md)
- [tour](domain/tour.md)
- [projektstatus](domain/projektstatus.md)
- [kunde](domain/kunde.md)

## Statusmatrix (kompakt)

| Bereich | Status | Hinweis |
|---|---|---|
| Technical: Multi-User | Abgedeckt | Konflikt- und Versionsfaelle fuer parallele Aenderungen dokumentiert |
| Technical: Transaktionen | Abgedeckt | Rollback und atomare Join-Ersetzung sind abgesichert |
| Technical: Sichtbarkeit/Zugriff | Abgedeckt | Rollen- und Scope-Regeln sind fuer Kernbereiche getestet |
| Technical: Test-Isolation | Abgedeckt | Reset- und Guard-Regeln sind durch Unit und Integration belegt |
| Domain: Termin | Abgedeckt | Historische Guards, Konfliktregeln und Versionssignale vorhanden |
| Domain: Projekt | Teilweise | Delete- und Versionsregeln klar, weitere Projektfachregeln nicht separat belegt |
| Domain: Mitarbeiter | Abgedeckt | Lifecycle, Sichtbarkeit, Berechtigung und Validierung belegt |
| Domain: Team | Abgedeckt | Lifecycle, Mitgliedschaft und Versionierung belegt |
| Domain: Tour | Abgedeckt | Lifecycle, Mitarbeiterzuordnung und Multi-User-Konflikte belegt |
| Domain: Projektstatus | Abgedeckt | Lifecycle, Relationen und Rollenregeln belegt |
| Domain: Kunde | Teilweise | Sichtbarkeit und Versioning-Wiring belegt, weitere Kundenfachregeln offen |