# BipBop Enterprise v1.3.8 — Riconciliazione Test FBA

Questa versione parte dalla v1.3.7 e mantiene la sincronizzazione cloud della v1.3.6.

## Novità
- Report ordini = fonte autorevole delle vendite FBA reali.
- Incrocio per ASIN con Sponsored Products, Sponsored Brands e Sponsored Display solo quando il report contiene un ASIN esplicito.
- Vendite separate in:
  - attribuite Ads;
  - non attribuite nei report Ads;
  - non riconciliabili / periodi non allineati.
- TACoS reale per ASIN FBA = spesa Ads attribuibile all'ASIN / ricavi reali da ordini.
- ACOS = spesa Ads / vendite attribuite Ads.
- Segnale Store mostrato solo se è possibile collegare direttamente ASIN o titolo ai dati Store.
- Indicatore di affidabilità della riconciliazione.

## Regola importante
"Non attribuita nei report Ads" non significa automaticamente "organica". Può includere ritorni successivi del cliente, ricerca diretta, finestre di attribuzione differenti o report non perfettamente allineati temporalmente.
