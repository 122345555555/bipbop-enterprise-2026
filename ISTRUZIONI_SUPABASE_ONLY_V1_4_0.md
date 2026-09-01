# BipBop Enterprise 2026 v1.4.0 — Supabase Only

- Report Amazon: `bb100_report_files`, `bb100_raw_rows`, `bb100_import_log`.
- Dati operativi: `bb100_operational_data`.
- Nessun report, FBA Test, vendita manuale, costo, competitor o regola economica viene salvato in localStorage.
- `bb100_config` resta nel browser esclusivamente per URL e chiave di connessione Supabase.
- Eventuali vecchie chiavi `bb100_rules` e `bb100_cloud_migration` vengono eliminate all'avvio.
- Diagnostica mostra anche l'ultima importazione cloud.
