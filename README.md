# BipBop Enterprise 2026 - Repository Definitivo

Questa è la versione pulita definitiva da usare in un NUOVO repository GitHub:

bipbop-enterprise-2026

## Regola principale

Non usare più:
- bipbop-command-center
- bipbop-command-center-new
- vecchie patch
- vecchi deploy Vercel

Questa versione legge solo tabelle Supabase con prefisso:

bb13_

## File da caricare su GitHub

Carica tutto il contenuto di questa cartella nel nuovo repository.

File principali:
- index.html
- style.css
- config.js
- supabase.js
- app.js
- vercel.json
- sql/schema_v13_report_center.sql

## Supabase

Nel SQL Editor esegui:

sql/schema_v13_report_center.sql

Questo crea solo le nuove tabelle:
- bb13_transactions
- bb13_ad_invoices
- bb13_ads_campaigns
- bb13_search_terms
- bb13_business_report
- bb13_inventory
- bb13_costs

## Vercel

Crea un nuovo progetto Vercel collegato SOLO al repository:

bipbop-enterprise-2026

Impostazioni:
- Framework Preset: Other
- Build Command: lascia vuoto
- Output Directory: lascia vuoto oppure .
- Install Command: lascia vuoto

## Controllo corretto

Quando apri il sito devi vedere:

BipBop v13 Report Center

Nel menu deve esserci:
- Dashboard
- Import Amazon
- Diagnostica
- Profitto
- Ads
- ASIN
- Setup

In Diagnostica deve comparire:

SOLO TABELLE bb13

Se non compare questa scritta, stai aprendo il progetto sbagliato.
