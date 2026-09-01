# BipBop Enterprise 2026 v1.3.6 — Cloud Sync

## Novità v1.3.6

Supabase è ora la fonte autorevole anche per:

- regole economiche;
- costi prodotto;
- competitor;
- vendite manuali;
- FBA Test, inclusi stato, tracking, Shipment ID e `statusHistory`.

`bb100_rules` viene letto soltanto come fallback iniziale e come sorgente della migrazione. Dopo una migrazione verificata viene rimosso; in localStorage restano solo configurazione Supabase e ricevuta tecnica della migrazione.

Le tabelle e i calcoli dei report Amazon non sono stati modificati.

## Installazione / deploy

1. Aprire Supabase → SQL Editor.
2. Eseguire integralmente `sql/schema_v1_3_6_cloud_operational_data.sql`.
3. Pubblicare l'intera cartella su GitHub/Vercel (configurazione `vercel.json` già inclusa).
4. Aprire la nuova app sul Mac dell'ufficio, verificare URL e chiave Supabase in **Setup** e premere **Aggiorna dati**.
5. In **Setup → Migrazione una tantum dal Mac**, premere **Genera anteprima**.
6. Controllare i numeri dei cinque dataset e scaricare il backup locale.
7. Premere **Conferma migrazione cloud** soltanto sul Mac di riferimento.
8. Aprire **Diagnostica** e verificare che ogni riga riporti origine Supabase e stato `OK`.
9. Aprire l'app su un secondo computer e verificare nuovamente conteggi, costi e stati FBA.

La migrazione usa una fingerprint univoca: ripetere la stessa operazione non crea duplicati. Prima di ogni migrazione/scrittura viene salvata una copia in `bb100_operational_backups`; lo snapshot originale completo è anche registrato in `bb100_operational_migrations`.

## Nuove tabelle

- `bb100_operational_data`: record attivi, univoci per dataset e chiave;
- `bb100_operational_backups`: snapshot prima di migrazioni e scritture;
- `bb100_operational_migrations`: ricevuta, fingerprint e sorgente completa della migrazione.

## Ripristino

Il file JSON scaricato prima della conferma è il fallback esterno. I backup cloud non vengono applicati automaticamente: in caso di necessità, recuperarli da `bb100_operational_backups` e verificare l'`operation_id` prima di ripristinare. Non cancellare né modificare le tabelle dei report Amazon.

---

## Riconciliazione Profit Report v1.3.5

Le fee escludono ricavi netti e Ads. Profit Report, Ads e canone vengono confrontati soltanto sullo stesso periodo; quando le coperture non coincidono, il saldo è indicato come parziale e le Ads esterne non vengono sottratte.

## Profit Center allineato v1.3.4

Profit Center e Costi prodotto usano ora ricavi e quantità dei Report ordini validi dal 01/01/2025. Gli ordini annullati e le righe non valide sono esclusi; i costi unitari manuali restano invariati.

## Correzione ordini v1.3.3

Gli ordini annullati sono esclusi dai KPI. Se un Report ordini già caricato viene importato nuovamente, viene riprocessato con il parser aggiornato e sostituisce nei calcoli la precedente copia importata male, senza cancellare lo storico.

## Riepilogo storico v1.3.2

Nell'Executive è disponibile il riepilogo **Totali dal 01/01/2025 a oggi**, con vendite, unità, ordini unici, valore medio ordine, prezzo medio e copertura temporale dei report. Il calcolo usa una sola fonte primaria per non sommare più volte gli stessi ricavi.

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


## v1.4.0 — Supabase Only
Dalla v1.4.0 tutti i dati applicativi persistenti (report Amazon e dati operativi) sono salvati esclusivamente su Supabase. Il browser conserva soltanto `bb100_config`, cioè URL e chiave tecnica necessari per collegarsi a Supabase. I vecchi `bb100_rules` / `bb100_cloud_migration` vengono rimossi all'avvio e non sono più letti.
