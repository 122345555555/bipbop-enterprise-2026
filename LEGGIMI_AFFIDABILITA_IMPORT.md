# Affidabilità degli import Amazon

L'app conserva ogni file nell'Archivio, ma i KPI usano una vista riconciliata.

## Regole automatiche

- Business Report, Inventario, Profit Report e pagine Store: viene usato l'ultimo snapshot disponibile.
- Ordini e Transazioni: le righe sovrapposte vengono riconosciute e contate una sola volta.
- Fatture Ads: la stessa fattura viene contata una sola volta.
- Sponsored Products, Sponsored Brands e Sponsored Display:
  - campagne diverse restano entrambe attive;
  - un nuovo report della stessa campagna sostituisce soltanto la versione precedente;
  - livelli diversi (campagna, gruppo annunci, keyword) non vengono sommati tra loro.
- Search Terms / Keyword:
  - periodi differenti vengono sommati nello storico;
  - un nuovo file dello stesso periodo sostituisce soltanto quel periodo;
  - i mesi abbreviati nei nomi Amazon (`gen`, `lug`, `ott`, ecc.) vengono
    riconosciuti come date del report;
  - più campagne esportate separatamente nello stesso giorno rimangono
    distinte anche quando Amazon non inserisce il nome campagna nelle colonne;
  - un file identico resta escluso dai totali;
  - la pagina Keyword mostra quanti periodi sono stati sommati e l'intervallo coperto.
- Un file identico può rimanere visibile nello storico, ma non entra una seconda volta nei KPI.

## Controllo

In **Archivio** ogni file mostra uno stato:

- `Attivo nei KPI`
- `Storico sostituito`
- `Duplicato escluso`

In **Diagnostica** sono visibili:

- righe usate nei KPI;
- righe sovrapposte neutralizzate;
- file storici non sommati;
- regola applicata a ogni tipo di report.

Non è più necessario eliminare manualmente i report precedenti o ricordare i vecchi totali.
