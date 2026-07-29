window.BBLegacy = {
  archives:[
    {name:"BB70",log:"bb70_import_log",rows:"bb70_raw_rows",fileId:true},
    {name:"BB60",log:"bb60_import_log",rows:"bb60_raw_reports"},
    {name:"BB50",log:"bb50_import_log",rows:"bb50_raw_reports"},
    {name:"BB40",log:"bb40_import_log",rows:"bb40_raw_reports"},
    {name:"BB30",log:"bb30_import_log",rows:"bb30_raw_reports"},
    {name:"BB20",log:"bb20_import_log",rows:"bb20_raw_reports"},
    {name:"Enterprise",log:"bb_enterprise_import_log",rows:"bb_enterprise_raw_reports"},
    {name:"BB14",log:"bb14_import_log",rows:"bb14_raw_reports"}
  ],

  isOrders(meta){
    const type=BBUtils.low(meta?.report_type||"");
    const headers=(Array.isArray(meta?.headers)?meta.headers:[]).map(BBUtils.low).join(" | ");
    return type==="orders" || type.includes("report ordini") ||
      (headers.includes("order-id")&&headers.includes("quantity-purchased"));
  },

  async allRows(db,table,filter){
    const out=[],pageSize=1000;
    for(let from=0;;from+=pageSize){
      let query=db.from(table).select("*").range(from,from+pageSize-1);
      if(filter?.field&&filter.value!==undefined&&filter.value!==null&&filter.value!==""){
        query=query.eq(filter.field,filter.value);
      }
      const result=await query;
      if(result.error) throw new Error(result.error.message);
      const page=result.data||[];
      out.push(...page);
      if(page.length<pageSize) break;
    }
    return out;
  },

  async archiveLogs(db,archive){
    try{
      return await this.allRows(db,archive.log);
    }catch(error){
      // Le installazioni più recenti possono non avere tutte le vecchie
      // tabelle. L'assenza di un archivio non è un errore bloccante.
      return [];
    }
  },

  async rowsFor(db,archive,meta){
    const attempts=[];
    if(archive.fileId&&meta.file_id) attempts.push({field:"file_id",value:meta.file_id});
    if(meta.fingerprint) attempts.push({field:"fingerprint",value:meta.fingerprint});
    if(meta.file_name) attempts.push({field:"file_name",value:meta.file_name});
    for(const filter of attempts){
      try{
        const records=await this.allRows(db,archive.rows,filter);
        if(records.length) return records;
      }catch(error){}
    }
    return [];
  },

  async recoverOrders(onProgress){
    const db=BBStorage.client();
    if(!db) throw new Error("Supabase non configurato.");
    const report=id=>{ if(onProgress) onProgress(id); };
    let found=0,recovered=0,duplicates=0,empty=0;
    const seenLegacy=new Set();

    for(const archive of this.archives){
      report("Controllo archivio "+archive.name+"…");
      const logs=await this.archiveLogs(db,archive);
      for(const meta of logs.filter(row=>this.isOrders(row)&&!row.is_duplicate)){
        const legacyKey=archive.name+"|"+String(meta.id||meta.file_id||meta.fingerprint||meta.file_name);
        if(seenLegacy.has(legacyKey)) continue;
        seenLegacy.add(legacyKey);
        found++;
        const records=await this.rowsFor(db,archive,meta);
        const rows=records.map(record=>record.row_data||record.data||{}).filter(row=>Object.keys(row).length);
        if(!rows.length){ empty++; continue; }
        const headers=Array.isArray(meta.headers)&&meta.headers.length
          ? meta.headers
          : Array.from(new Set(rows.flatMap(row=>Object.keys(row))));
        const fingerprint=meta.fingerprint ||
          records.find(record=>record.fingerprint)?.fingerprint ||
          await BBUtils.sha256(JSON.stringify(rows));
        const fileName=meta.file_name||records[0]?.file_name||("Report_ordini_recuperato_"+archive.name+".txt");
        const source={
          ...(meta.source||records[0]?.source||{}),
          legacy_archive:archive.name,
          legacy_id:meta.id||null,
          recovered_at:new Date().toISOString()
        };
        const result=await BBStorage.insertFile(
          "orders",fileName,headers,rows,fingerprint,source,meta.delimiter||"\t",
          {smartReconciliation:true}
        );
        if(result.isDuplicate) duplicates++;
        else recovered++;
        report(archive.name+": "+fileName+" — "+(result.isDuplicate?"già presente":"recuperato"));
      }
    }
    return {found,recovered,duplicates,empty};
  }
};
