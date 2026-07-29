# BipBop Enterprise 2026 v1.4 — Milestone Intelligence operativa

Versione stabile del centro di comando Amazon per BipBop.

## Novità della milestone

- Restyling responsive completo: nessuno scroll orizzontale globale; le tabelle larghe scorrono solo nel proprio riquadro.
- **Analisi Dati** con ordini univoci, righe prodotto, pezzi, fatturato, riepilogo mensile, dettaglio mese e filtri per Order ID, ASIN, SKU e prodotto.
- Controllo di coerenza dell'import indipendente dai filtri di consultazione.
- Archivio con copertura temporale visibile per ogni file e distinzione esplicita tra Transazioni e Report ordini.
- Controllo dei Report ordini mensili da gennaio 2025: presente, coperto solo da cumulativo oppure mancante.
- Recupero guidato dei Report ordini dalle precedenti tabelle BB14/BB20/BB30/BB40/BB50/BB60/BB70 ed Enterprise, con deduplicazione prima della copia in `bb100_`.
- Dashboard **Catalog Search Performance** con periodo coperto, data/periodo per ASIN, KPI, riepilogo, punti forti, criticità, opportunità e azioni consigliate.
- Distinzione esplicita tra acquisti attribuiti a Catalog Search e ordini Amazon complessivi, con confronto sullo stesso periodo quando il Report ordini è disponibile.
- Nel confronto ordini sono visibili order ID distinti, righe prodotto, pezzi e fatturato; il giorno finale del periodo è incluso per intero anche quando gli ordini contengono ora e fuso.
- Supporto ai nomi colonna italiani effettivi di Amazon, inclusi `Aggiunte carrello: aggiunte carrello` e `Acquisti: acquisti`.
- Struttura base **AI Coach** con sintesi e priorità operative in sola lettura.

## Compatibilità e sicurezza dati

Questa milestone non modifica:

- `src/parser.js`;
- `src/reconcile.js`;
- `src/storage.js`;
- `supabase.js`;
- tabelle, dati o prefisso database `bb100_`.

Per l'aggiornamento non serve eseguire SQL.

## Include
- Amazon Smart Parser
- Import deduplicato con sostituzione sicura dei vecchi report
- Data e ora dell'ultimo import visibili per ogni report
- Semaforo settimanale: si azzera ogni martedì e torna verde dopo il nuovo import
- Executive Dashboard
- Sales Intelligence
- Advertising Intelligence
- ASIN Intelligence
- Keyword Intelligence
- Brand Analytics
- Profit Center
- Growth Plan
- AI Decision Center
- Alert Center
- Diagnostica

## Database definitivo
Usa tabelle con prefisso:

- bb100_report_files
- bb100_import_log
- bb100_raw_rows
- bb100_ai_decisions
- bb100_cost_rules
- bb100_settings

## Supabase
Per chi aggiorna da v1.0 non serve nuovo SQL.

Solo per una nuova installazione da zero esegui:

sql/schema_bipbop_enterprise_2026_v1_0.sql

## Diagnostica
Deve comparire:

SOLO TABELLE BB100 GROWTH ENGINE
