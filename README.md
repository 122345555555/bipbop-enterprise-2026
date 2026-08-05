# BipBop Enterprise 2026 v1.3.1 Growth Engine — FBA Manager

Versione stabile del centro di comando Amazon per BipBop.

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
- FBA Test con stati modificabili, storico, spedizioni e tempi logistici

## FBA Manager v1.3.1

- Menu stato direttamente nella tabella ASIN
- Stati: Da preparare, In produzione, Pronto, Inviato, Ricevuto da Amazon, Attivo FBA
- Data dell'ultimo cambio e storico dei passaggi
- Scheda invio con data, corriere, tracking, Shipment ID, colli, peso e quantità
- Selezione multipla e comando “Segna come inviati”
- Filtro e KPI per stato
- Giorni da Inviato a Ricevuto, da Ricevuto ad Attivo e tempo totale
- Compatibilità con i precedenti stati e ASIN già salvati

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

Anche l'aggiornamento FBA v1.3.1 non richiede SQL: usa lo stesso archivio locale `bb100_rules` già adottato dalla sezione FBA.

Solo per una nuova installazione da zero esegui:

sql/schema_bipbop_enterprise_2026_v1_0.sql

## Diagnostica
Deve comparire:

SOLO TABELLE BB100 GROWTH ENGINE
