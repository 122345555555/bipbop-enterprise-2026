# BipBop Enterprise 2026 v1.2 Growth Engine

Versione stabile del centro di comando Amazon per BipBop.

## Include
- Amazon Smart Parser
- Import deduplicato con sostituzione sicura dei vecchi report
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
