# Migration Runbook

Dieses Dokument beschreibt den verbindlichen Kurzpfad fuer Migrationspruefung und Migrationsausfuehrung.

## Status pruefen

- Development: `npm run db:migration-status:dev`
- Test: `npm run db:migration-status:test`
- Production: `npm run db:migration-status:prod`

Wenn die Ausgabe `Status: synchron` meldet, ist die Ziel-DB auf dem Stand der Repository-Migrationen.

Wenn die Ausgabe `Fehlende Migrationen:` meldet, muss der Migrationslauf ausgefuehrt werden.

Wenn die Ausgabe `Unerwartete DB-Eintraege:` meldet, stimmt die DB-Historie nicht mit dem Repository ueberein. In diesem Fall nicht still weiter deployen.

## Migration ausfuehren

- Development: `npm run db:migrate:dev`
- Test: `npm run db:migrate:test`
- Production: `npm run db:migrate:prod`

Die Migrationsskripte pruefen zuerst den Zielzustand. Wenn keine Migration noetig ist, endet der Lauf mit einer No-op-Meldung.

## Verbindlicher Ablauf

1. `npm run db:migration-status:<umgebung>`
2. Falls nicht synchron: `npm run db:migrate:<umgebung>`
3. Danach erneut `npm run db:migration-status:<umgebung>`

Ein Schema-Deployment gilt erst dann als abgeschlossen, wenn der abschliessende Status-Check wieder `Status: synchron` meldet.

## Hinweise

- `db:push` ist nicht der regulaere Projektpfad.
- Die Scripts arbeiten gegen die fuer den Modus vorgesehene Env-Datei.
- Im Testmodus bleibt `NODE_ENV=test` plus `MUGPLAN_MODE=test` verpflichtend.
