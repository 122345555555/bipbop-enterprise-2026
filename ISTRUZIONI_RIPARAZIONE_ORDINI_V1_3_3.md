# BipBop Enterprise 2026 v1.3.3 — Riparazione Report ordini

## Errore corretto

I vecchi import potevano perdere quantità e prezzo quando il titolo del prodotto conteneva virgolette. Inoltre gli ordini annullati venivano inclusi nel conteggio degli ordini unici.

La versione v1.3.3:

- esclude gli ordini annullati da ordini, unità, fatturato e valore medio;
- segnala separatamente quanti ordini annullati sono presenti;
- segnala le righe non annullate che hanno quantità o prezzo non validi;
- permette di riprocessare un Report ordini già presente.

## Operazione necessaria dopo la pubblicazione

1. Aprire **Import Amazon**.
2. Selezionare nuovamente tutti i Report ordini originali dal 01/01/2025 a oggi.
3. Attendere il messaggio **Report ordini già presente, riprocessato con il lettore aggiornato**.
4. Aprire **Analisi dati** e controllare che `Quantità non valide` e `Prezzi non validi` siano entrambi a zero.
5. Tornare nell'Executive e verificare il riepilogo storico.

Con i Report ordini originali attualmente presenti sul computer, il controllo dal 01/01/2025 produce:

- **194 ordini validi**;
- **7 ordini annullati esclusi**;
- **218 unità vendute**;
- **4.132,52 € di fatturato valido**.

Questi valori presuppongono che vengano ricaricati tutti i Report ordini originali analizzati e che non siano stati aggiunti nuovi ordini nel frattempo.

Non eliminare manualmente i vecchi file: la nuova importazione li conserva nello storico e li esclude automaticamente dai KPI. Non serve nuovo SQL.
