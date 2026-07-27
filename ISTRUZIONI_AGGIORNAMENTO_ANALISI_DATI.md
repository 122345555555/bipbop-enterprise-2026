# BipBop Enterprise 2026 v1.1 — Analisi Dati ordini

## Installazione

1. Estrai lo ZIP.
2. Carica tutti i file nel repository GitHub `bipbop-enterprise-2026`, sostituendo quelli esistenti.
3. Attendi il deploy automatico di Vercel.
4. Apri il sito e aggiorna la pagina forzando la cache (`Cmd+Shift+R` su Mac).

Se il Report ordini era già stato importato con la versione precedente:

1. apri `Archivio`;
2. elimina quel file ordini;
3. importalo nuovamente come `Report ordini`.

Il passaggio è necessario perché quantità e prezzi già salvati con colonne disallineate devono essere riletti dal parser corretto.

## SQL

Non è necessario eseguire nuovo SQL: l'aggiornamento usa le tabelle `bb100_` già presenti, in particolare `bb100_raw_rows`.

Solo per una nuova installazione da zero, esegui:

`sql/schema_bipbop_enterprise_2026_v1_0.sql`

## Utilizzo

1. Importa il Report ordini Amazon nella destinazione `Report ordini`.
2. Apri `Analisi Dati`.
3. Controlla:
   - ordini unici da `order-id`;
   - righe prodotto non duplicate;
   - pezzi da `quantity-purchased`;
   - fatturato da `item-price`;
   - riepilogo mensile e dettaglio del singolo mese;
   - confronto con il mese precedente;
   - esito del controllo di coerenza.

I file identici restano bloccati dall'hash. Se due file diversi contengono righe ordine sovrapposte, l'analisi neutralizza i duplicati usando `order-item-id` (o una firma di riserva).
