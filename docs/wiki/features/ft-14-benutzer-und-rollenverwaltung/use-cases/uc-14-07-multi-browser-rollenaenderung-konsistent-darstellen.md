# UC 14/07: Multi-Browser-Rollenänderung konsistent darstellen

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Admin

## Ziel

Sicherstellen, dass Rollenänderungen in parallelen Sitzungen konsistent wirksam werden.

## Vorbedingungen

- Ein Benutzer ist in zwei Browsern angemeldet.
- Eine Rolle wird geändert.

## Ablauf

1. Der Akteur ändert die Rolle eines Benutzers.
2. Das System persistiert die neue Rolle.
3. In der zweiten Sitzung wird eine neue Anfrage gestellt.
4. Das System prüft die Rolle erneut serverseitig.
5. Das System setzt die neue Berechtigungsstufe durch.

## Alternativen

- Sitzung verwendet veraltete Tokens → System validiert bei nächstem Request.

## Ergebnis

Rollenänderungen wirken konsistent in allen Sitzungen.

