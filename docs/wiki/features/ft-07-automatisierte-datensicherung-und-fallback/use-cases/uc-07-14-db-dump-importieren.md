# UC 07/14: DB-Dump importieren

## Metadaten

- Feature: [FT (07): Automatisierte Datensicherung und Fallback](../ft-07-automatisierte-datensicherung-und-fallback.md)

## Akteur

Administrator

## Ziel

Einen vorhandenen DB-Dump nach Vorprüfung kontrolliert in die Zielinstanz importieren.

## Vorbedingungen

- Administrator ist angemeldet.
- Dump-ZIP liegt vor.
- Zielumgebung erfüllt die konfigurierten Datenbank-Sicherheitsregeln.

## Ablauf

- Administrator lädt das Dump-ZIP zur Preview hoch.
- System prüft ZIP, `data.json`, optionales `manifest.json`, Tabellen- und Upload-Prüfsummen sowie blockierende Sicherheitsregeln.
- System zeigt Importbereitschaft, Warnungen, Blocker und Sicherheitsbestätigung an.
- Administrator bestätigt den Import mit der erwarteten Sicherheitsphrase.
- System legt vor dem Import ein Zielbackup und Transfer-Artefakte an.
- System importiert Tabellen und Anhänge, mappt `users.roleCode` auf lokale Systemrollen und verifiziert Tabellen- und Upload-Ergebnis.

## Alternativen

- Nicht-Admin ruft Preview oder Apply auf → Zugriff wird serverseitig verweigert.
- Dump ist beschädigt oder unvollständig → Preview beziehungsweise Apply bricht mit fachlichem Fehler ab.
- Manifest-Prüfsummen widersprechen dem ZIP-Inhalt → Import wird blockiert.
- Benutzer referenzieren eine unbekannte Rolle → Apply bricht ab und die Datenbanktransaktion wird zurückgerollt.
- Legacy-Dump ohne `users` → Import bleibt tolerant; lokale Benutzer werden nicht gelöscht.

## Ergebnis

Der Dump ist importiert und verifiziert oder der Import wurde ohne Teilübernahme blockiert. Ein echter DB-Dry-Run vor dem Apply ist als offene Erweiterung dokumentiert, aber noch nicht Bestandteil dieses Use Cases.
