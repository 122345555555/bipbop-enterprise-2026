-- PULIZIA OPZIONALE se il file Sponsored Brands è stato classificato come Costi BipBop
-- Esegui solo se vuoi rimuovere quel caricamento errato dallo storico.

delete from bb50_raw_reports
where report_type = 'product_costs'
  and file_name ilike 'Sponsored_Brands_ad_groups%';

delete from bb50_import_log
where report_type = 'product_costs'
  and file_name ilike 'Sponsored_Brands_ad_groups%';

notify pgrst, 'reload schema';
