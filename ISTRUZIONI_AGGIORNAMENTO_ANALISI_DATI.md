# BipBop Enterprise 2026 v1.3 — Analisi Dati e controllo settimanale

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

## Sostituzione automatica dei vecchi report

Nella pagina `Import Amazon` è selezionata automaticamente l'opzione
`Sostituisci i vecchi report dello stesso tipo`.

- Il nuovo report viene prima importato e verificato.
- Solo dopo un import riuscito vengono eliminati i vecchi file dello stesso tipo.
- Se un file genera un errore, i vecchi report restano disponibili.
- Per più campagne Sponsored Brands, Sponsored Products o Sponsored Display,
  seleziona tutti i file della stessa famiglia nello stesso caricamento:
  resteranno tutti i nuovi file e verrà eliminato soltanto il gruppo precedente.
- Se vuoi conservare e sommare lo storico, togli la spunta prima del caricamento.

Non occorre eseguire nuovo SQL: la funzione usa le tabelle `bb100_*` già presenti.

## Data import e semaforo del martedì

- Ogni riquadro nella pagina `Import Amazon` mostra data e ora dell'ultimo
  import.
- Anche il messaggio di importazione conferma immediatamente data e ora.
- Il semaforo generale è visibile nell'intestazione e in `Executive`.
- Ogni martedì, all'inizio della nuova settimana di controllo, il semaforo
  diventa rosso.
- Dopo almeno un nuovo import effettuato da quel martedì in avanti, il
  semaforo generale torna verde.
- Nei riquadri dei singoli report restano rossi quelli che non sono stati
  aggiornati nella settimana corrente.
