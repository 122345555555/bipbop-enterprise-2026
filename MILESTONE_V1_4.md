# Milestone v1.4 — Analisi Dati, Catalog Search e AI Coach

## Installazione

1. Carica tutti i file di questo pacchetto nel repository GitHub, mantenendo le cartelle.
2. Attendi il deploy Vercel.
3. Aggiorna l'app con `Cmd+Shift+R` su Mac o `Ctrl+F5` su Windows.

Non eseguire script SQL: il database resta `bb100_`.

## Archivio e copertura

L'Archivio mostra la copertura temporale dichiarata nel nome del file o, quando il nome non contiene date, l'intervallo ricavato dalle righe. Transazioni e Report ordini sono conservati come fonti distinte: il primo contiene movimenti economici e commissioni, il secondo ordini distinti, righe prodotto e quantità.

Per i Report ordini è presente un controllo mese per mese a partire da gennaio 2025. Ogni mese viene indicato come:

- **Mensile**, se esiste un file ordini dedicato a quel mese;
- **Cumulativo**, se i dati del mese sono presenti soltanto in un file che copre più mesi;
- **Manca**, se non risulta alcun file che copra quel mese.

I file originali non vengono creati o suddivisi artificialmente: devono essere scaricati da Amazon e importati. Gli `order-item-id` sovrapposti restano deduplicati nei KPI.

Prima del caricamento manuale è possibile usare **Recupera Report ordini dai vecchi archivi**. La funzione cerca i Report ordini nelle tabelle delle precedenti versioni, copia in `bb100_` soltanto quelli non ancora presenti e lascia intatti i dati sorgente. Se una vecchia tabella non esiste, viene semplicemente ignorata.

## Analisi Dati

La sezione calcola:

- ordini distinti da `order-id`;
- righe prodotto deduplicate;
- pezzi venduti da `quantity-purchased`;
- fatturato da `item-price`;
- riepilogo mese per mese;
- dettaglio degli ordini del mese;
- filtri per Order ID, ASIN, SKU e prodotto;
- quadratura dell'import completa, anche quando sono attivi filtri di consultazione.

## Catalog Search Performance

La dashboard legge le righe del report Amazon “Cerca performance catalogo” già importate nell'archivio e mostra:

- periodo complessivo coperto dal report;
- data o intervallo temporale disponibile per ogni ASIN;
- impressioni, clic, CTR, carrelli, acquisti e conversione;
- conferma esplicita quando gli acquisti sono realmente zero nel CSV sorgente;
- confronto con gli ordini Amazon complessivi dello stesso periodo, se è presente il Report ordini: order ID distinti, righe prodotto, pezzi e fatturato;
- inclusione dell'intera giornata finale anche quando `purchase-date` contiene ora e fuso;
- distinzione esplicita tra acquisti attribuiti alla ricerca e ordini Amazon provenienti da qualsiasi percorso;
- lettura delle intestazioni italiane `Aggiunte carrello: aggiunte carrello` e `Acquisti: acquisti`;
- prodotti con buona risposta;
- prodotti con traffico ma CTR o conversione deboli;
- azioni consigliate basate su regole trasparenti.

Se il report è già importato sotto Brand Analytics, non deve essere ricaricato: la dashboard riconosce le righe catalogo dal contenuto.

## AI Coach

AI Coach è una struttura decisionale locale e in sola lettura. Incrocia le analisi esistenti e il Catalog Search Performance per produrre:

- riassunto;
- punti forti;
- criticità;
- opportunità;
- azioni consigliate.

Non modifica automaticamente campagne, offerte, prezzi, file o record.
