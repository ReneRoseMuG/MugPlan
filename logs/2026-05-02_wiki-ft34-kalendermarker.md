# Wiki FT34 Kalendermarker

Datum: 02.05.26

## Zweck

Redaktionelle Integration des Themas Feiertage, Betriebsfeiertage und Betriebsferien in das Repo-Wiki als eigenständiges Feature.

## Scope

- Neues Feature `FT (34): Kalendermarker, Feiertage und Betriebsferien` angelegt.
- Sechs Use Cases für Anzeige, Pflege, Seed, Aktiv-Status, globale Visualisierung und Rollenblockade ergänzt.
- Zentrale Feature- und Use-Case-Indizes aktualisiert.
- Querbeziehungen zu FT (01), FT (03), FT (18) und FT (20) dokumentiert.
- FT (01) um die Abgrenzung ergänzt, dass Kalendermarker keine Termine sind.
- FT (03) um die konsumierende, rein visuelle Darstellung von Kalendermarkern ergänzt.

## Technische Entscheidungen

- Das Thema wird nicht in FT (01) oder FT (03) versteckt, sondern als eigenes Feature geführt.
- FT (03) konsumiert FT (34) nur für die Kalenderdarstellung.
- FT (18) bleibt der fachliche Ort für die Settings-Infrastruktur.
- FT (20) bleibt der fachliche Ort für Rollen- und Sichtbarkeitsgrenzen.

## Betroffene Dateien

- `docs/wiki/features/ft-34-kalendermarker-feiertage-betriebsferien/feature.md`
- `docs/wiki/features/ft-34-kalendermarker-feiertage-betriebsferien/use-cases/README.md`
- `docs/wiki/features/ft-34-kalendermarker-feiertage-betriebsferien/use-cases/*.md`
- `docs/wiki/features/README.md`
- `docs/wiki/use-cases.md`
- `docs/wiki/relations.md`
- `docs/wiki/features/ft-01-kalendertermine/feature.md`
- `docs/wiki/features/ft-03-kalenderansichten/feature.md`

## Tests und Verifikation

- Keine Testausführung, da reine Wiki-Redaktionsarbeit.
- Verifikation über gezielte Suche nach `FT (34)` und `uc-34` im Wiki.

## Bekannte Einschränkungen

- Das Feature wurde neu im Repo-Wiki erfasst und besitzt keine Notion-Quelle.
- Keine Codeänderung im Rahmen dieser Redaktionsarbeit.
