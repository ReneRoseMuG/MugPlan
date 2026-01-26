# FT-11: Team-Verwaltung mit Datenbankanbindung

## Übersicht
Implementierung der Team-Verwaltung mit vollständiger PostgreSQL-Datenbankanbindung, analog zur bestehenden Tour-Verwaltung.

## Implementierte Dateien

### Backend/Shared
| Datei | Änderung |
|-------|----------|
| `shared/schema.ts` | `teams` Tabelle (id, name, color) |
| `shared/routes.ts` | API-Definitionen für teams CRUD |
| `server/storage.ts` | `getTeams`, `createTeam`, `updateTeam`, `deleteTeam` |
| `server/routes.ts` | Express-Handler für `/api/teams` |

### Frontend
| Datei | Änderung |
|-------|----------|
| `client/src/components/TeamManagement.tsx` | Von Demo-Daten auf TanStack Query umgestellt |

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/teams` | Alle Teams abrufen |
| POST | `/api/teams` | Neues Team erstellen |
| PATCH | `/api/teams/:id` | Team-Farbe aktualisieren |
| DELETE | `/api/teams/:id` | Team löschen |

## Datenbank-Schema

```typescript
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
});
```

## Features

- **Automatische Benennung**: "Team 1", "Team 2", etc. (basierend auf max(id)+1)
- **Pastel-Farben**: Vordefinierte Farbpalette bei Erstellung
- **Color-Picker**: Farbe kann nachträglich geändert werden
- **Mitarbeiter-Zuweisung**: Aktuell nur im UI-State (Demo), FK-Relationen später

## Architektur-Hinweis

Die Implementierung folgt dem bestehenden Muster der Tour-Verwaltung:
- Direkter DB-Zugriff in `storage.ts`
- Keine strikte Repo/Controller/Service-Trennung
- Konsistent mit bestehendem Code, dokumentierte Abweichung von `docs/architektur.md`

## Offene Punkte

- [ ] FK-Relation: Employee <-> Team (geplant für spätere Phase)
- [ ] Mitarbeiter-Zuweisungen persistieren
- [ ] Integration mit Terminplanung

## Datum
26. Januar 2026
