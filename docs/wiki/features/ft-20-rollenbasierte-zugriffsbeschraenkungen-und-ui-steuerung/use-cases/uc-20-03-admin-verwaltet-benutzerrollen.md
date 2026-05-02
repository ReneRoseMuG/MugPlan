# UC 20/03: Admin verwaltet Benutzerrollen

## Metadaten

- Feature: [FT (20): Rollenbasierte ZugriffsbeschrÃ¤nkungen und UI-Steuerung](../ft-20-rollenbasierte-zugriffsbeschraenkungen-und-ui-steuerung.md)
- Notion-Quelle: https://app.notion.com/p/f29fe0b8f4a443f982ef140a3983e737
- Importstatus: VollstÃ¤ndig aus lokalem Notion-Markdown-Export Ã¼bernommen

## Akteur

Admin

## Ziel

Die Rolle eines bestehenden Benutzers Ã¤ndern.

## Vorbedingungen

- Der Akteur ist authentifiziert.
- Der Akteur besitzt die Rolle Admin.
- Der zu Ã¤ndernde Benutzer existiert.
- Mindestens ein Admin bleibt im System erhalten.

## Ablauf

1. Akteur Ã¶ffnet die Benutzerverwaltung.
2. Akteur wÃ¤hlt einen Benutzer aus.
3. Akteur wÃ¤hlt eine neue Rolle.
4. Das System prÃ¼ft, ob durch die Ã„nderung kein letzter Admin entfernt wird.
5. Das System speichert die neue Rolle.
6. Das System macht die neue Rolle unmittelbar wirksam.

## Alternativen

- Der zu Ã¤ndernde Benutzer existiert nicht â†’ System antwortet mit 404.
- Die Ã„nderung wÃ¼rde den letzten Admin entfernen â†’ System blockiert mit 409.
- Der Akteur besitzt keine Admin-Rolle â†’ System blockiert mit 403.

## Ergebnis

Die neue Rolle ist persistiert.

Die Berechtigungen des betroffenen Benutzers Ã¤ndern sich entsprechend.

