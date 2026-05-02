# UC 14/04: Letzten Admin schÃ¼tzen

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Sicherstellen, dass das System niemals ohne Admin bleibt.

## Vorbedingungen

- Es existiert genau ein Admin.
- Der Akteur versucht, diesen herabzustufen oder zu lÃ¶schen.

## Ablauf

1. Der Akteur startet die RollenÃ¤nderung oder LÃ¶schung.
2. Das System prÃ¼ft die Anzahl verbleibender Admins.
3. Das System erkennt, dass kein weiterer Admin existiert.
4. Das System blockiert die Aktion.
5. Das System antwortet mit 409.

## Alternativen

- Es existieren mehrere Admins â†’ Aktion wird erlaubt.

## Ergebnis

Mindestens ein Admin bleibt im System erhalten.

