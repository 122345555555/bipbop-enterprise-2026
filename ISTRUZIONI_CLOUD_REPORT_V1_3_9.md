# BipBop Enterprise 2026 v1.3.9 — Diagnostica report cloud

Questa versione chiarisce la diagnostica dei dati.

## Dove sono salvati i report Amazon
I file importati e le relative righe sono salvati su Supabase nelle tabelle:
- `bb100_report_files` — metadati dei file importati;
- `bb100_raw_rows` — righe originali dei report;
- `bb100_import_log` — storico degli import.

Questi dati sono quindi condivisi tra Mac e PC quando entrambi utilizzano la stessa configurazione Supabase.

## Cosa resta nel browser
`bb100_config` contiene soltanto URL e chiave di collegamento a Supabase. Non contiene i report Amazon.

## Dati operativi
FBA Test, regole economiche, costi prodotto, vendite manuali e competitor restano sincronizzati nella tabella `bb100_operational_data`.

## Modifica v1.3.9
La pagina Diagnostica ora distingue esplicitamente:
- Archivio report = Supabase;
- Configurazione browser = solo credenziali/configurazione di connessione.
