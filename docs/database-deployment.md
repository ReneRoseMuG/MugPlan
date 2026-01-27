# Datenbank-Strategie: Entwicklung und Deployment

## Übersicht

Die Anwendung wird in zwei unterschiedlichen Datenbankumgebungen betrieben:

| Umgebung | Datenbank | Zweck |
|----------|-----------|-------|
| **Entwicklung** (Replit) | PostgreSQL | Prototyping, Feature-Entwicklung, Testing |
| **Produktion** (Provider) | MySQL | Live-Betrieb auf Kunden-Domain |

## Strategie

### Entwicklung auf Replit
- PostgreSQL bleibt die Entwicklungsdatenbank
- Drizzle ORM abstrahiert datenbankspezifische Unterschiede
- Alle Features werden hier entwickelt und getestet

### Deployment beim Provider
- MySQL-Datenbank wird vom Provider bereitgestellt
- Bei Erstinstallation: App-Code übertragen + Datenbank-Schema erstellen
- Bei Updates mit Schema-Änderungen: Migrations-Script schreiben

## Unterschiede PostgreSQL vs MySQL

### Meist automatisch durch Drizzle ORM gehandhabt:
- Datentypen (`serial` → `int auto_increment`)
- String-Funktionen
- Boolean-Handling

### Manuell zu beachten:
| Feature | PostgreSQL | MySQL |
|---------|------------|-------|
| Auto-Increment | `serial` | `int().autoincrement()` |
| Datum/Zeit | `timestamp` | `datetime` |
| JSON | Native `jsonb` | `json` (ab MySQL 5.7) |
| Case-Sensitivity | Case-sensitive | Meist case-insensitive |

## Migrations-Workflow

### Erstinstallation
1. MySQL-Datenbank auf Provider-Domain einrichten (bereits erledigt durch Provider)
2. Drizzle-Konfiguration auf MySQL umstellen
3. `drizzle-kit push` ausführen → Schema wird erstellt
4. App-Code deployen

### Updates mit Schema-Änderungen
1. Änderungen in `shared/schema.ts` vornehmen
2. Migration generieren: `drizzle-kit generate`
3. Migrations-Script prüfen und ggf. anpassen
4. Auf Produktionsserver anwenden: `drizzle-kit migrate`

## Risikobewertung

### Niedriges Risiko
- **Einfache Tabellen**: id, text, integer, boolean → Problemlos
- **Standard-CRUD**: Lesen, Schreiben, Löschen → Identisch
- **Relationen**: Foreign Keys funktionieren gleich

### Mittleres Risiko (Anpassung nötig)
- **Datum/Zeit-Funktionen**: PostgreSQL `now()` vs MySQL `NOW()`
- **Array-Spalten**: PostgreSQL-spezifisch → JSON-Alternative für MySQL
- **Volltextsuche**: Unterschiedliche Syntax

### Zu vermeiden
- PostgreSQL-spezifische Features (JSONB-Operatoren, Arrays)
- Datenbank-spezifische Funktionen in Raw-SQL

## Empfehlungen

1. **ORM-Abfragen bevorzugen**: Drizzle-Queries statt Raw-SQL
2. **Einfache Datentypen nutzen**: text, integer, boolean, timestamp
3. **Arrays vermeiden**: Stattdessen JSON oder Relationen nutzen
4. **Regelmäßig testen**: Schema-Änderungen in beiden DBs validieren

## Konfiguration für MySQL (Deployment)

```typescript
// drizzle.config.ts für MySQL
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_HOST!,
    user: process.env.MYSQL_USER!,
    password: process.env.MYSQL_PASSWORD!,
    database: process.env.MYSQL_DATABASE!,
  },
});
```

## Benutzer und Rollen

Diese Funktionalität wird nachträglich implementiert. Die Datenbank-Strategie bleibt davon unberührt - sowohl PostgreSQL als auch MySQL unterstützen die benötigten Features für Benutzerverwaltung und Rollenzuweisung.
