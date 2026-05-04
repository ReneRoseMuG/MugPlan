# UC 13/11: Notizvorlage löschen

## Metadaten

- Feature: [FT (13): Notizverwaltung](../ft-13-notizverwaltung.md)
- Notion-Quelle: https://app.notion.com/p/876216f2188c4fc58fcc65152f783906
- Importstatus: Vollständig aus lokalem Notion-Markdown-Export übernommen

## Akteur

Disponent, Administrator

## Ziel

Eine bestehende Notizvorlage endgültig aus dem System entfernen, ohne bereits erstellte Notizen zu verändern.

## Vorbedingungen

- Die Vorlage existiert.
- Der Akteur ist authentifiziert.
- Der Akteur besitzt Zugriff auf die Vorlagenverwaltung gemäÃŸ Rollenkonzept.
- Die Vorlage verfügt über ein Versionierungsmerkmal (z. B. `version` oder `updated_at`).

## Ablauf

1. Der Akteur öffnet die Vorlagenverwaltung.
2. Der Akteur wählt eine bestehende Vorlage aus.
3. Der Akteur wählt die Funktion „Löschen".
4. Das System zeigt eine Sicherheitsabfrage an.
5. Der Akteur bestätigt das Löschen.
6. Das System prüft serverseitig:
    - Authentifizierung,
    - Berechtigung,
    - Ãœbereinstimmung des Versionsmerkmals.
7. Stimmen die Versionsinformationen überein, löscht das System die Vorlage endgültig aus der Persistenz.
8. Das System aktualisiert die Vorlagenliste.

### Alternativabläufe

- Der Akteur bricht die Sicherheitsabfrage ab → Die Vorlage bleibt unverändert bestehen.
- Der Akteur ist nicht authentifiziert → HTTP 401, keine Löschung.
- Der Akteur besitzt keine ausreichende Rolle → HTTP 403, keine Löschung.
- Versionskonflikt → HTTP 409 Conflict, keine Löschung, Neuladen erforderlich.
- Technischer Fehler → HTTP 500, keine Löschung.

## Alternativen

Nicht angegeben in der Notion-Quelle.

## Ergebnis

- Die Vorlage ist im Erfolgsfall vollständig aus dem System entfernt.
- Gelöschte Vorlagen erscheinen nicht mehr in der Vorlagenverwaltung und nicht in der Auswahlliste bei der Notizerstellung.
- Bereits erstellte Notizen bleiben unverändert bestehen.
- Es entstehen keine verwaisten Referenzen oder Seiteneffekte in bestehenden Notizen.

