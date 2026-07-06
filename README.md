# BipBop Enterprise 6.0 Scalable Importer

Questa versione risolve il problema dei file simili.

## Regola importante

- Puoi importare più file dello stesso tipo, ad esempio 2 Sponsored Brands.
- I file diversi vengono sommati nei dati attivi.
- Lo stesso file identico viene riconosciuto come duplicato e NON viene sommato.

## Tabelle

Usa solo:
- bb60_import_log
- bb60_raw_reports
- bb60_settings

## Supabase

Esegui una volta:
sql/schema_enterprise_6_0_scalable_importer.sql
