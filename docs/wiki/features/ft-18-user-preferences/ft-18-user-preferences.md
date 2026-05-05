# FT (18): User Preferences

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck


## Fachliche Beschreibung

Die Anwendung bietet eine zentrale Oberfläche, in der berechtigte Nutzer Einstellungen anzeigen und ändern können. Jede Einstellung ist durch einen eindeutigen Schlüssel identifiziert und besitzt einen fest definierten Datentyp sowie einen Standardwert. Der wirksame Wert ergibt sich aus einem gespeicherten Wert; sofern kein Wert gespeichert ist, gilt der Standardwert.

Die Eingabe und Darstellung in der UI erfolgt generisch anhand des Einstellungstyps. Bool-Einstellungen werden als Schalter bedient, Zahlen als numerische Eingabe und Farben über eine Farbauswahl. Das System ist so gestaltet, dass weitere Typen und neue Einstellungen ergänzt werden können, ohne dass dafür für jede Einstellung eine eigene Persistenzlogik oder ein eigener Screen erforderlich wird.

## Regeln & Randbedingungen

Eine Einstellung darf nur gespeichert werden, wenn der Wert zum definierten Typ passt und die fachlich vorgesehenen Constraints erfüllt. Ungültige Eingaben werden abgelehnt und mit einer verständlichen Fehlermeldung zurückgemeldet.

Jede Einstellung besitzt einen Standardwert. Wenn kein Wert gespeichert ist, wird ausschließlich der Standardwert verwendet. Der aktuell wirksame Wert muss in der UI transparent angezeigt werden.

Berechtigungen müssen eindeutig greifen. Normale Nutzer dürfen ausschließlich ihre benutzerspezifischen Einstellungen bearbeiten. Administratoren dürfen zusätzlich Einstellungen bearbeiten, die in einem übergeordneten Kontext gelten, sofern solche Kontexte im Produkt genutzt werden.

Zu Beginn müssen mindestens die Typen Zahl, Bool (Aktivität) und Farbe unterstützt werden. Weitere Typen wie Text, Auswahlwerte (Enum) oder Wertebereiche (Min/Max/Step) sollen später ohne Bruch ergänzt werden können.

## Use Cases

- [UC 18/01: Persönliche Einstellung ändern](use-cases/uc-18-01-persoenliche-einstellung-aendern.md)
- [UC 18/02: Persönliche Einstellung auf Standardwert zurücksetzen](use-cases/uc-18-02-persoenliche-einstellung-auf-standardwert-zuruecksetzen.md)
- [UC 18/03: Unberechtigten Zugriff auf persönliche Einstellungen verhindern](use-cases/uc-18-03-unberechtigten-zugriff-auf-persoenliche-einstellungen-verhindern.md)
- [UC 18/04: Versionskonflikt bei paralleler Änderung persönlicher Einstellungen](use-cases/uc-18-04-versionskonflikt-bei-paralleler-aenderung-persoenlicher-einstellungen.md)

## Backlogs


## Architektur & Kontext


## Entscheidungen & Offene Punkte
