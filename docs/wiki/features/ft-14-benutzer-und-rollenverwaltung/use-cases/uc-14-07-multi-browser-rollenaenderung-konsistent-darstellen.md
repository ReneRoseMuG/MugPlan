# UC 14/07: Multi-Browser-RollenÃ¤nderung konsistent darstellen

## Metadaten

- Feature: [FT (14): Benutzer- und Rollenverwaltung](../ft-14-benutzer-und-rollenverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/9b2597a244b74023b822b2c94668ebc4
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Sicherstellen, dass RollenÃ¤nderungen in parallelen Sitzungen konsistent wirksam werden.

## Vorbedingungen

- Ein Benutzer ist in zwei Browsern angemeldet.
- Eine Rolle wird geÃ¤ndert.

## Ablauf

1. Der Akteur Ã¤ndert die Rolle eines Benutzers.
2. Das System persistiert die neue Rolle.
3. In der zweiten Sitzung wird eine neue Anfrage gestellt.
4. Das System prÃ¼ft die Rolle erneut serverseitig.
5. Das System setzt die neue Berechtigungsstufe durch.

## Alternativen

- Sitzung verwendet veraltete Tokens â†’ System validiert bei nÃ¤chstem Request.

## Ergebnis

RollenÃ¤nderungen wirken konsistent in allen Sitzungen.

