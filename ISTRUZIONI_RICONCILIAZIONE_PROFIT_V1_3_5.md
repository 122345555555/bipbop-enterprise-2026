# BipBop Enterprise 2026 v1.3.5 — Riconciliazione Profit Center

La versione corregge due anomalie:

- la colonna `Totale: Ricavi netti` non viene più conteggiata come fee Amazon;
- Ads e canone non vengono più sottratti da un Profit Report riferito a un periodo differente.

La sezione **Riconciliazione Profit Report** mostra sempre il periodo analizzato.

- Se Profit Report e report Ads hanno lo stesso intervallo, viene mostrato un **Saldo comparabile**.
- Se gli intervalli non coincidono, viene mostrato un **Saldo parziale** e le Ads esterne non vengono sottratte.
- Il canone viene proporzionato ai giorni coperti dal Profit Report.

Il conto economico storico dal 01/01/2025 rimane separato e utilizza gli ordini validi e i costi unitari configurati.

Le Ads storiche vengono distribuite sui prodotti e sottratte dal saldo soltanto se il loro intervallo copre tutto il periodo degli ordini. Se, ad esempio, gli ordini partono il 01/01/2025 ma la fattura Ads parte il 06/07/2025, l'app mostra:

- **Ads importate non allocate**;
- **Netto prima delle Ads**;
- **Saldo storico parziale**;
- un avviso con le due date di copertura.

Questo evita di confrontare ricavi di 19 mesi con costi pubblicitari di soli 12 mesi.

Non serve nuovo SQL.
