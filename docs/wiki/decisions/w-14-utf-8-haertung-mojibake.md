# W-14 - UTF-8-Härtung gegen Umlaute und Mojibake

## Metadaten

- Status: offen
- Priorität: Hoch
- Feature: Repo-weite Text-, Encoding- und Qualitätsabsicherung
- Entdeckt: 02.05.26
- Art: Technische Schuld

## Befund

In der Codebase treten wiederkehrend Probleme mit Umlauten und Mojibake-Artefakten auf. Vorhandene Scans finden Symptome, schließen aber die Eintrittspfade nicht zuverlässig. Relevante Risiken liegen vor allem in Editor- und Workspace-Konfigurationen, impliziter Node-Datei-I/O, HTML-/Response-Nähe sowie fehlenden Guards gegen neue kaputte Zeichenfolgen in geänderten Textdateien.

## Optionen

- A) Weitere reine Bereinigungsrunden fahren und Mojibake-Fälle weiterhin nur nachträglich entfernen
- B) Kleine, risikoarme UTF-8-Härtung an der Quelle einführen: Editor-/Repo-Grundlage schärfen, relevante I/O explizit auf UTF-8 setzen und einen Guard gegen neue Mojibake-Muster in den bestehenden Qualitätsprozess einbauen
- C) Große automatische Umkodierung der Codebase oder Datenhaltung anstoßen

## Auswirkungen eines Eingriffs

Variante B macht die Codebase robuster gegen neue Encoding-Schäden, ohne produktive Daten oder Altdateien pauschal umzuschreiben. Betroffen sind vor allem Konfiguration, textnahe Node-I/O, HTML-/Response-Ausgabe und Prüfscripte. Fachliche Features sollen unverändert bleiben; größere Altlasten dürfen sichtbar bleiben, wenn eine automatische Korrektur riskant wäre.

## Schadenspotential

Mittel. Ohne Härtung können neue Mojibake-Fälle weiter in Code, UI, Templates, Seeds oder Dokumentation einsickern. Ein zu aggressiver Eingriff hätte aber ebenfalls Risiko, etwa durch unbeabsichtigte Massenkonvertierungen, Datenverfälschung oder unnötige False Positives im Qualitätsprozess. Deshalb ist nur eine gezielte Härtung vertretbar.

## Vorgeschlagene Maßnahme

Variante B als bevorzugten Pfad behandeln. Zuerst reale Eintrittspfade identifizieren, dann eine kleine UTF-8-Grundlage für Editor/Repo und relevante I/O härten und schließlich einen klaren Guard gegen ungültiges UTF-8 oder typische Mojibake-Muster in geänderten Textdateien ergänzen. Keine DB-Zeichensatzmigration, keine großflächige Umkodierung.

## Quelle

- Notion: https://www.notion.so/349da094354e8011a40ad18ea78f112e
