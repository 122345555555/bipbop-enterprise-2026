# Aggiornamento FBA v1.3.1

Questa release parte dalla versione completa `bipbop-enterprise-2026-main.zip` (v1.3) e modifica soltanto la gestione operativa della sezione FBA Test.

## Pubblicazione

1. Conserva una copia del repository attualmente pubblicato.
2. Estrai lo ZIP v1.3.1.
3. Carica su GitHub tutto il contenuto estratto, mantenendo cartelle e nomi dei file.
4. Attendi il deploy automatico di Vercel.
5. Apri l'app e usa `Cmd+Shift+R` per forzare l'aggiornamento.

## Database

Non eseguire SQL. Parser, importazioni, tabelle Supabase `bb100_`, riconciliazione e calcoli restano invariati.

Gli ASIN FBA già inseriti continuano a essere letti dallo stesso archivio locale usato dalla v1.3. I vecchi stati `In test`, `Riordina`, `Stop` e `Chiuso` restano disponibili per non perdere informazioni precedenti.

## Verifica rapida

1. Apri `FBA Test`.
2. Cambia un ASIN da `Da preparare` a `In produzione` e ricarica la pagina.
3. Impostalo su `Inviato` e completa tutti i dati della spedizione.
4. Passa a `Ricevuto da Amazon` e poi `Attivo FBA`.
5. Apri `Storico` e controlla date e passaggi.
6. Seleziona più ASIN e prova `Segna come inviati`.
