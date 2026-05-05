# FT (16): Hilfetexte verwalten

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature ermöglicht die zentrale Verwaltung von Hilfetexten in der Anwendung, die von Benutzern kontextbezogen über Hilfe-Symbole in der UI abgerufen werden können. Ziel ist, fachliche Bedienhinweise konsistent, wartbar und rollenbasiert bereitzustellen, ohne dass Hilfetexte in einzelnen UI-Views dupliziert oder fest im Frontend verdrahtet werden müssen.

## Fachliche Beschreibung

Ein Hilfetext ist ein eigenständiges, administrierbares Objekt mit eindeutiger Kennung („help_key“), Titel und formatierbarem Inhalt (Markdown). Hilfetexte werden in der UI kontextbezogen über ein Hilfe-Symbol (z. B. „?“ oder „i“) angezeigt. Die UI übergibt beim Abruf den help_key, das System liefert den passenden Hilfetext zurück.

Hilfetexte sind rein informativ. Sie verändern keine fachlichen Daten (Kunden, Projekte, Termine, Touren etc.) und sind unabhängig von Termin- und Planungslogik. Sie dienen der besseren Bedienbarkeit, der Einarbeitung und der Reduzierung von Rückfragen.

Die Pflege der Hilfetexte erfolgt administrativ. Disponenten und Leser können Hilfetexte anzeigen, aber nicht verändern. Admins können Hilfetexte anlegen, bearbeiten, aktivieren/deaktivieren und verwalten.

## Regeln & Randbedingungen

Ein Hilfetext besitzt einen eindeutigen help_key und darf pro help_key nur einmal existieren.

Hilfetexte sind global gültig; die Kontextbindung erfolgt ausschließlich über den help_key, nicht über direkte Fremdschlüssel auf Domainobjekte.

Hilfetexte haben keine fachliche Wirkung und sind ausschließlich Anzeige-/Dokumentationsinhalte.

Hilfetexte können aktiviert/deaktiviert werden; deaktivierte Hilfetexte sind in der UI nicht abrufbar, bleiben aber aus Gründen der Nachvollziehbarkeit erhalten.

Die Verwaltung (CRUD) der Hilfetexte ist ausschließlich der Rolle Admin vorbehalten.

Die Anzeige der Hilfetexte ist für alle Rollen erlaubt, sofern der Text aktiv ist.

Der Inhalt wird als Markdown gespeichert; externe Ressourcen- oder Dateipfadabhängigkeiten aus dem Client sind nicht vorgesehen.

## Use Cases

- [UC 16/01: Hilfetext anzeigen (kontextbezogen)](use-cases/uc-16-01-hilfetext-anzeigen-kontextbezogen.md)
- [UC 16/02: Hilfetext anlegen](use-cases/uc-16-02-hilfetext-anlegen.md)
- [UC 16/03: Hilfetext bearbeiten](use-cases/uc-16-03-hilfetext-bearbeiten.md)
- [UC 16/04: Hilfetext aktivieren/deaktivieren](use-cases/uc-16-04-hilfetext-aktivieren-deaktivieren.md)
- [UC 16/05: Hilfetexte durchsuchen und anzeigen](use-cases/uc-16-05-hilfetexte-durchsuchen-und-anzeigen.md)
- [UC 16/06: Hilfetext löschen](use-cases/uc-16-06-hilfetext-loeschen.md)
- [UC 16/07: Versionskonflikt bei paralleler Bearbeitung eines Hilfetextes](use-cases/uc-16-07-versionskonflikt-bei-paralleler-bearbeitung-eines-hilfetextes.md)
- [UC 16/08: Unberechtigter Zugriff auf Hilfetext-Verwaltung verhindern](use-cases/uc-16-08-unberechtigter-zugriff-auf-hilfetext-verwaltung-verhindern.md)
- [UC 16/09: Hilfetexte aus Datei importieren](use-cases/uc-16-09-hilfetexte-aus-datei-importieren.md)
- [UC 16/10: Hilfetexte in Datei exportieren](use-cases/uc-16-10-hilfetexte-in-datei-exportieren.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
