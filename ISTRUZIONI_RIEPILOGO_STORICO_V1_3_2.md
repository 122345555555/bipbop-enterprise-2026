# BipBop Enterprise 2026 v1.3.2 — Riepilogo storico

Nell'Executive è presente il nuovo blocco **Totali dal 01/01/2025 a oggi**.

Il blocco mostra:

- vendite totali;
- unità vendute;
- ordini unici;
- valore medio ordine;
- prezzo medio per unità;
- data dell'ultimo dato disponibile.

## Affidabilità del calcolo

Per evitare doppi conteggi, vendite e unità provengono da una sola fonte primaria:

1. Report ordini;
2. Business Report, se il Report ordini non è disponibile;
3. Profit Report, se mancano entrambi i report precedenti.

Le vendite manuali non ancora coperte dai report vengono aggiunte una sola volta.

Il riquadro segnala se la copertura è completa dal 01/01/2025, parziale oppure non verificabile perché il report non contiene date.

## Cosa importare

Per avere ordini e copertura temporale verificabili, importare i Report ordini Amazon comprendenti tutto il periodo dal 01/01/2025 a oggi. Il database e lo schema SQL non cambiano.
