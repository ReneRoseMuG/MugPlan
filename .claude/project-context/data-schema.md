# Datenmodell-Übersicht — MugPlan

Kurzzusammenfassung der zentralen Entitäten.
Autoritative Quelle: `shared/schema.ts` (Drizzle ORM)
Vollständige Architekturinfo: `docs/architecture.md` §6

---

## Zentrale Entitäten

| Tabelle | Domäne | Bemerkung |
|---|---|---|
| `customer` | Kunden | Stammdaten, `isActive`-Flag |
| `project` | Projekte | Stammdaten, `isActive`-Flag, FK auf `customer` |
| `project_order` | Projektaufträge | FK auf `project` |
| `project_order_items` | Auftragspositionen | FK auf `project_order` |
| `appointments` | Termine | Kern-Entität; muss `projectId` oder `customerId` haben |
| `employee` | Mitarbeiter | Stammdaten, `isActive`-Flag |
| `teams` | Teams | Mitarbeitergruppierungen |
| `tours` | Touren | Dispositionstouren |
| `tour_weeks` | Kalenderwochen-Planung | Wochenplanung pro Tour |
| `tour_week_employees` | KW-Mitarbeiterplanung | Join: Tour-KW × Mitarbeiter |
| `project_status` | Projektstatus | Werteliste |
| `project_project_status` | Status-Zuordnung | Join: Projekt × Status |
| `tags` | Tags | System-Tags und benutzerdefinierte Tags |
| `project_tags` | Tag-Zuordnung | Join: Projekt × Tag |
| `customer_tags` | Tag-Zuordnung | Join: Kunde × Tag |
| `employee_tags` | Tag-Zuordnung | Join: Mitarbeiter × Tag |
| `appointment_tags` | Tag-Zuordnung | Join: Termin × Tag |
| `note` | Notizen | FK auf Projekt, Kunde oder Mitarbeiter |
| `note_template` | Notizvorlagen | |
| `project_attachment` | Anhänge | Projekt-Dokumente |
| `customer_attachment` | Anhänge | Kunden-Dokumente |
| `employee_attachment` | Anhänge | Mitarbeiter-Dokumente |
| `users` | Benutzer | Auth, FK auf `roles` |
| `roles` | Rollen | `LESER`, `DISPONENT`, `ADMIN` |
| `user_settings_value` | Benutzereinstellungen | Key-Value-Store pro User |
| `backup_log` | Backup-Protokoll | |
| `calendar_sync_log` | Kalender-Sync-Protokoll | |

Masterdata-Tabellen für Produkte, Komponenten und Spezifikationen (FT27) — Details in `shared/schema.ts`.

---

## Fachliche Invarianten auf Datenbankebene

- **Termin-Relationspflicht:** `appointments.projectId` gesetzt ODER `appointments.customerId` direkt gesetzt (bei null `projectId`)
- **Mitarbeiter-Overlap:** Konflikterkennung in `appointmentsService`, blockierend via HTTP 409
- **Archivierung:** primär über `isActive`-Flag, kein physisches Löschen im Normalpfad
- **System-Tags:** `Storniert`, `Geparkt`, `Planung blockiert` — im Tag-Picker versteckt (via `isPickerVisibleForDomain`)

---

## Migrations-Versionierung

```
migrations/          ← Versionshistorie (nicht umschreiben)
migrations/meta/     ← Drizzle Metadata
```

Jede Schemaänderung erfordert eine neue Migrationsdatei. Änderungen nur in `shared/schema.ts` ohne Migration sind unzulässig.
