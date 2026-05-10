# Notion-Wiki-UC-Migrationsreport

Stand: 09.05.26

## Pr?fumfang

- Quelle: Notion-Lastenheft-Datenbank und die daraus abgerufenen Featureseiten.
- Ziel: `docs/wiki/features/**/use-cases/*.md`.
- Vollst?ndigkeitskriterium: mehr als 10 Zeilen und echter Text in mindestens einem Pflichtabschnitt wie Akteur, Ziel, Beschreibung, Vorbedingungen, Ablauf oder Ergebnis.
- Korrekt bef?llte lokale Dateien wurden nicht ?berschrieben.
- Notion-Abrufe erfolgten ?ber den verbundenen Notion-Connector. Direkte `next_cursor`-Kontrolle ist in diesem Connector nicht exponiert; bei den verarbeiteten Seiten wurden keine Abruffehler oder Rate-Limit-Fehler gemeldet.
- FT-24 und FT-34 wurden lokal mitgepr?ft; in der Lastenheft-DB-View war keine gleichnamige Featureseite auffindbar.

## Zusammenfassung

- UCs gesamt: 237
- Erfolgreich ?bertragen oder verifiziert: 236
- Fehlgeschlagen gesamt: 1
- Leer: 1
- Rate Limit: 0
- Sonstiger Fehler: 0

## Detailprotokoll

| UC-ID | Feature | Status | Zeilen | Anmerkung |
|-------|---------|--------|--------|-----------|
| UC-01/01 | FT-01 | ? OK | 80 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/02 | FT-01 | ? OK | 71 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/03 | FT-01 | ? OK | 51 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/04 | FT-01 | ? OK | 44 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/05 | FT-01 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/06 | FT-01 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/07 | FT-01 | ? OK | 45 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/08 | FT-01 | ? OK | 46 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/09 | FT-01 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/10 | FT-01 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/11 | FT-01 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/12 | FT-01 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/13 | FT-01 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/14 | FT-01 | ? OK | 90 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/15 | FT-01 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/16 | FT-01 | ? OK | 44 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/17 | FT-01 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/18 | FT-01 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/19 | FT-01 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/20 | FT-01 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/21 | FT-01 | ? OK | 51 | Bereits bef?llt; nicht ?berschrieben. |
| UC-01/22 | FT-01 | ? OK | 46 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/01 | FT-02 | ? OK | 47 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/02 | FT-02 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/03 | FT-02 | ? OK | 44 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/04 | FT-02 | ? OK | 50 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/05 | FT-02 | ? OK | 54 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/06 | FT-02 | ? OK | 63 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/07 | FT-02 | ? OK | 48 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/08 | FT-02 | ? OK | 52 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/09 | FT-02 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/10 | FT-02 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/11 | FT-02 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/12 | FT-02 | ? OK | 38 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/13 | FT-02 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/14 | FT-02 | ? OK | 46 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/15 | FT-02 | ? OK | 45 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/16 | FT-02 | ? OK | 65 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/17 | FT-02 | ? OK | 46 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/18 | FT-02 | ? OK | 45 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/19 | FT-02 | ? OK | 38 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/21 | FT-02 | ? OK | 119 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/22 | FT-02 | ? OK | 44 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/23 | FT-02 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/24 | FT-02 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-02/26 | FT-02 | ? OK | 51 | Bereits bef?llt; nicht ?berschrieben. |
| UC-03/01 | FT-03 | ? OK | 33 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-03/02 | FT-03 | ? OK | 32 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-03/03 | FT-03 | ? OK | 32 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-03/04 | FT-03 | ? OK | 31 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-03/05 | FT-03 | ? OK | 33 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-03/06 | FT-03 | ? OK | 33 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/01 | FT-04 | ? OK | 45 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/02 | FT-04 | ? OK | 43 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/04 | FT-04 | ? OK | 43 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/05 | FT-04 | ? OK | 42 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/06 | FT-04 | ? OK | 40 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/07 | FT-04 | ? OK | 39 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/09 | FT-04 | ? OK | 37 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/10 | FT-04 | ? OK | 37 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/12 | FT-04 | ? OK | 46 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/13 | FT-04 | ? OK | 48 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/14 | FT-04 | ? OK | 45 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-04/15 | FT-04 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/01 | FT-05 | ? OK | 64 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/02 | FT-05 | ? OK | 66 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/03 | FT-05 | ? OK | 51 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/04 | FT-05 | ? OK | 68 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/05 | FT-05 | ? OK | 67 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/06 | FT-05 | ? OK | 76 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/07 | FT-05 | ? OK | 67 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/08 | FT-05 | ? OK | 59 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/09 | FT-05 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/10 | FT-05 | ? OK | 54 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/11 | FT-05 | ? OK | 48 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/12 | FT-05 | ? OK | 48 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/13 | FT-05 | ? OK | 55 | Bereits bef?llt; nicht ?berschrieben. |
| UC-05/14 | FT-05 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-06/00 | FT-06 | ? OK | 38 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-06/01 | FT-06 | ? OK | 37 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-06/02 | FT-06 | ? OK | 75 | Bereits bef?llt; nicht ?berschrieben. |
| UC-06/03 | FT-06 | ? OK | 40 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-06/04 | FT-06 | ? OK | 40 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-06/05 | FT-06 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
| UC-06/06 | FT-06 | ? OK | 36 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-07/03 | FT-07 | ? OK | 37 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-07/05 | FT-07 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/06 | FT-07 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/07 | FT-07 | ? OK | 32 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/08 | FT-07 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/09 | FT-07 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/10 | FT-07 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/11 | FT-07 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/12 | FT-07 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/13 | FT-07 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-07/14 | FT-07 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-08/01 | FT-08 | ? OK | 33 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-08/02 | FT-08 | ? OK | 32 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-08/03 | FT-08 | ? OK | 33 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-08/04 | FT-08 | ? OK | 33 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-08/05 | FT-08 | ? OK | 32 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-09/01 | FT-09 | ? OK | 55 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/02 | FT-09 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/03 | FT-09 | ? OK | 72 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/04 | FT-09 | ? OK | 59 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/06 | FT-09 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/07 | FT-09 | ? OK | 79 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/08 | FT-09 | ? OK | 48 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/09 | FT-09 | ? OK | 49 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/10 | FT-09 | ? OK | 67 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/11 | FT-09 | ? OK | 66 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/12 | FT-09 | ? OK | 59 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/13 | FT-09 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/14 | FT-09 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/15 | FT-09 | ? OK | 68 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/16 | FT-09 | ? OK | 96 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/17 | FT-09 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/18 | FT-09 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/19 | FT-09 | ? OK | 38 | Bereits bef?llt; nicht ?berschrieben. |
| UC-09/20 | FT-09 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-11/01 | FT-11 | ? OK | 56 | Bereits bef?llt; nicht ?berschrieben. |
| UC-11/02 | FT-11 | ? OK | 60 | Bereits bef?llt; nicht ?berschrieben. |
| UC-11/03 | FT-11 | ? OK | 49 | Bereits bef?llt; nicht ?berschrieben. |
| UC-11/04 | FT-11 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/01 | FT-13 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/02 | FT-13 | ? OK | 59 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/03 | FT-13 | ? OK | 56 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/04 | FT-13 | ? OK | 54 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/05 | FT-13 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/06 | FT-13 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/07 | FT-13 | ? OK | 55 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/08 | FT-13 | ? OK | 56 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/09 | FT-13 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/10 | FT-13 | ? OK | 52 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/11 | FT-13 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/12 | FT-13 | ? OK | 60 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/13 | FT-13 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/14 | FT-13 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/15 | FT-13 | ? OK | 55 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/16 | FT-13 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/17 | FT-13 | ? OK | 49 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/18 | FT-13 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/19 | FT-13 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/20 | FT-13 | ? OK | 61 | Bereits bef?llt; nicht ?berschrieben. |
| UC-13/21 | FT-13 | ? OK | 56 | Bereits bef?llt; nicht ?berschrieben. |
| UC-14/01 | FT-14 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-14/02 | FT-14 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-14/03 | FT-14 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
| UC-14/04 | FT-14 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-14/05 | FT-14 | ? OK | 34 | Bereits bef?llt; nicht ?berschrieben. |
| UC-14/06 | FT-14 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-14/07 | FT-14 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/01 | FT-16 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/02 | FT-16 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/03 | FT-16 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/04 | FT-16 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/05 | FT-16 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/06 | FT-16 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/07 | FT-16 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/08 | FT-16 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/09 | FT-16 | ? OK | 38 | Bereits bef?llt; nicht ?berschrieben. |
| UC-16/10 | FT-16 | ? OK | 33 | Bereits bef?llt; nicht ?berschrieben. |
| UC-18/01 | FT-18 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-18/02 | FT-18 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-18/03 | FT-18 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-18/04 | FT-18 | ? OK | 41 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/01 | FT-19 | ? OK | 57 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/02 | FT-19 | ? OK | 47 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/03 | FT-19 | ? OK | 49 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/04 | FT-19 | ? OK | 49 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/05 | FT-19 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/06 | FT-19 | ? OK | 48 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/07 | FT-19 | ? OK | 44 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/08 | FT-19 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/09 | FT-19 | ? OK | 65 | Bereits bef?llt; nicht ?berschrieben. |
| UC-19/10 | FT-19 | ? OK | 51 | Bereits bef?llt; nicht ?berschrieben. |
| UC-20/01 | FT-20 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-20/02 | FT-20 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-20/03 | FT-20 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/01 | FT-21 | ? OK | 49 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/02 | FT-21 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/03 | FT-21 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/04 | FT-21 | ? OK | 34 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/05 | FT-21 | ? OK | 34 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/06 | FT-21 | ? OK | 34 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/07 | FT-21 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/08 | FT-21 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/09 | FT-21 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/10 | FT-21 | ? OK | 38 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/11 | FT-21 | ? OK | 34 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/12 | FT-21 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/13 | FT-21 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/14 | FT-21 | ? OK | 35 | Bereits bef?llt; nicht ?berschrieben. |
| UC-21/17 | FT-21 | ? OK | 53 | Bereits bef?llt; nicht ?berschrieben. |
| UC-26/01 | FT-26 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-26/02 | FT-26 | ? OK | 32 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-26/03 | FT-26 | ? OK | 46 | Bereits bef?llt; nicht ?berschrieben. |
| UC-26/04 | FT-26 | ? OK | 33 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-26/05 | FT-26 | ? OK | 36 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-26/06 | FT-26 | ? OK | 44 | Bereits bef?llt; nicht ?berschrieben. |
| UC-26/07 | FT-26 | ? OK | 35 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-26/08 | FT-26 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-26/09 | FT-26 | ? OK | 35 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-26/10 | FT-26 | ? OK | 44 | Bereits bef?llt; nicht ?berschrieben. |
| UC-27/01 | FT-27 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-27/02 | FT-27 | ? OK | 40 | Bereits bef?llt; nicht ?berschrieben. |
| UC-27/03 | FT-27 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
| UC-27/04 | FT-27 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-27/05 | FT-27 | ? OK | 45 | Bereits bef?llt; nicht ?berschrieben. |
| UC-27/06 | FT-27 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-27/07 | FT-27 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
| UC-28/01 | FT-28 | ? OK | 34 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-28/02 | FT-28 | ? OK | 34 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-28/03 | FT-28 | ? OK | 36 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-28/04 | FT-28 | ? OK | 43 | Bereits bef?llt; nicht ?berschrieben. |
| UC-28/05 | FT-28 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-28/06 | FT-28 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-28/07 | FT-28 | ? OK | 35 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-31/01 | FT-31 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-31/02 | FT-31 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-31/03 | FT-31 | ? OK | 38 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-32/01 | FT-32 | ? OK | 32 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-32/02 | FT-32 | ? OK | 38 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-32/03 | FT-32 | ? OK | 35 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-32/04 | FT-32 | ? OK | 32 | Aus Notion-Featureseite nachbef?llt und lokal verifiziert. |
| UC-33/01 | FT-33 | ? OK | 32 | Bereits bef?llt; nicht ?berschrieben. |
| UC-33/02 | FT-33 | ? OK | 47 | Bereits bef?llt; nicht ?berschrieben. |
| UC-33/03 | FT-33 | ? OK | 42 | Bereits bef?llt; nicht ?berschrieben. |
| UC-33/04 | FT-33 | ? OK | 32 | Bereits bef?llt; nicht ?berschrieben. |
| UC-33/05 | FT-33 | ? OK | 34 | Bereits bef?llt; nicht ?berschrieben. |
| UC-34/01 | FT-34 | ? OK | 38 | Bereits bef?llt; nicht ?berschrieben. |
| UC-34/02 | FT-34 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-34/03 | FT-34 | ? OK | 39 | Bereits bef?llt; nicht ?berschrieben. |
| UC-34/04 | FT-34 | ? OK | 38 | Bereits bef?llt; nicht ?berschrieben. |
| UC-34/05 | FT-34 | ? OK | 37 | Bereits bef?llt; nicht ?berschrieben. |
| UC-34/06 | FT-34 | ? OK | 36 | Bereits bef?llt; nicht ?berschrieben. |
