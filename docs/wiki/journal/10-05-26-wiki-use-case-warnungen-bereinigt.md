# 10.05.26 | Wiki | Use-Case-Warnungen bereinigt

## Zusammenfassung

Die Wiki-Kontrolle für das Lastenheft wurde bereinigt. Ein entferntes FT-02-Duplikat der denormalisierten Projektanzeige wurde aus der lokalen Use-Case-Struktur entfernt, sodass es nicht mehr als aktive Use-Case-Datei, Indexeintrag oder generierte Use-Case-Seite erscheint.

Die zuvor gemeldeten leeren Abschnitte wurden anhand der lokalen Use-Case-Dateien und der Notion-Lastenheft-Seiten korrigiert. Ein großer Teil der Warnungen entstand nicht durch fehlenden fachlichen Inhalt, sondern durch abweichende Überschriften wie `### Alternativabläufe`, `## Ablauf – Upload` oder frei stehende `Vorbedingungen:` vor dem eigentlichen Pflichtabschnitt. Diese Inhalte wurden in die erwarteten Pflichtabschnitte `## Ablauf`, `## Alternativen` und `## Vorbedingungen` überführt.

Zusätzlich wurde der Wiki-Kontrolllauf geschärft: bewusst unspezifizierte Feature-Hüllen mit Backlog-Status und ohne angelegte Use Cases werden nicht mehr als fehlende Use-Case-Datei gemeldet. Normale Features ohne lokale Use-Case-Dateien bleiben weiterhin warnpflichtig.

## Verifikation

- Wiki-Build: `node scripts/build-wiki-site.mjs` erfolgreich.
- Kontrollbericht: `0 Fehler, 0 Warnungsgruppen`.
- Suche nach dem entfernten FT-02-Duplikat in `docs/wiki` und `scripts`: keine aktive Referenz mehr.
- Encoding: `npm run check:encoding` erfolgreich.
- Diff-Prüfung: `git diff --check` erfolgreich.
- Skript-Syntax: `node --check scripts/build-wiki-site.mjs` erfolgreich.

## Rollen

Es wurden keine App-Rollen, Berechtigungen, Endpunkte oder UI-Sichtbarkeiten geändert. Die Änderungen betreffen ausschließlich Wiki-/Lastenheft-Inhalte und den Kontrollbericht der generierten Wiki.

## Verknüpfungen

- Lastenheft: lokale Use-Case-Dateien unter `docs/wiki/features/*/use-cases/`
- Kontrollbericht: [Wiki-Kontrollbericht](../site/control-report.html)
- Notion-Quelle: Lastenheft-Datenbank im Projektkontext
