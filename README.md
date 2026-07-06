# BipBop Enterprise 7.1 Smart Parser

Patch compatibile con 7.0: migliora il parser senza cambiare l'architettura.

## Nuovo supporto
- Righe introduttive Amazon: `Nota:`, `Marchio=`, metadati Brand Analytics
- Statement / Fatture Ads con nota iniziale
- Brand Analytics – Performance query di ricerca
- Header non sempre alla prima riga
- Separatore automatico mantenuto: comma, punto e virgola, TAB, pipe

## Supabase
Se hai già eseguito lo schema 7.0, non devi rieseguire nulla.

Se vuoi installare da zero:
sql/schema_enterprise_7_1_smart_parser.sql

## Diagnostica
La diagnostica resta:
SOLO TABELLE BB70 FINAL
