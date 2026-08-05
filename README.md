# BipBop Enterprise 2026 v1.1 FBA Manager

Versione stabile del centro di comando Amazon per BipBop.

## Include
- Amazon Smart Parser
- Import storico e deduplicato
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
- FBA Test con stati persistenti, storico e spedizioni

## Novità FBA v1.1

- Stato modificabile per ogni ASIN: Da preparare, In produzione, Pronto, Inviato, Ricevuto da Amazon, Attivo FBA
- Data dell'ultimo cambio e storico dei passaggi
- Dati obbligatori all'invio: data, corriere, tracking, Shipment ID, colli, peso e quantità
- Selezione multipla e azione “Segna come inviati”
- Filtro per stato e KPI di conteggio
- Giorni da Inviato a Ricevuto, da Ricevuto ad Attivo e tempo totale

## Database definitivo
Usa tabelle con prefisso:

- bb100_report_files
- bb100_import_log
- bb100_raw_rows
- bb100_ai_decisions
- bb100_cost_rules
- bb100_settings
- bb100_fba_asin_status
- bb100_fba_status_history

## Supabase
Esegui:

sql/schema_bipbop_enterprise_2026_v1_0.sql

Poi esegui la migrazione additiva:

sql/migration_bb100_fba_manager_v1_1.sql

La migrazione crea solo le nuove strutture FBA. Non modifica né cancella dati, calcoli o tabelle esistenti.

## Diagnostica
Deve comparire:

SOLO TABELLE BB100 GROWTH ENGINE
