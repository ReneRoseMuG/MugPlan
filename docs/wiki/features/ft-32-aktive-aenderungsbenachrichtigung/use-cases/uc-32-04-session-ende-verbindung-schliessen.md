# UC 32/04: Session-Ende – Verbindung schließen

## Metadaten

- Feature: [FT (32): Aktive Änderungsbenachrichtigung](../ft-32-aktive-aenderungsbenachrichtigung.md)

## Akteur

Angemeldeter Benutzer aller Rollen

## Ziel

Beim Logout oder Schließen des Browsers die SSE-Verbindung sauber beenden und serverseitige Ressourcen freigeben.

## Vorbedingungen

- Eine aktive SSE-Verbindung für die Session besteht.

## Ablauf

1. Der Benutzer meldet sich ab oder schließt den Browser-Tab.
2. Der Server erkennt das Ende der Verbindung.
3. Der Server entfernt die Session aus der Liste aktiver Empfänger.

## Alternativen

Keine.

## Ergebnis

Es werden keine Ereignisse mehr an diese Session gesendet. Serverseitige Ressourcen sind freigegeben.
