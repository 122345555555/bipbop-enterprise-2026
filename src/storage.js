window.BBStorage = {
  config(){
    try { return JSON.parse(localStorage.getItem(window.BIPBOP_CONFIG.storageKey) || "{}"); }
    catch(e){ return {}; }
  },
  saveConfig(cfg){ localStorage.setItem(window.BIPBOP_CONFIG.storageKey, JSON.stringify(cfg || {})); },
  client(){
    const cfg=this.config();
    if(!cfg.url || !cfg.key || !window.supabase) return null;
    return window.supabase.createClient(cfg.url,cfg.key);
  },
  async insertFile(reportType,fileName,headers,rows,fingerprint,source,delimiter,options={}){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");

    const dup=await db.from("bb100_report_files").select("id,file_name,imported_at,row_count,column_count,is_duplicate").eq("fingerprint",fingerprint).eq("report_type",reportType).limit(100);
    if(dup.error) throw new Error(dup.error.message);
    const duplicateFound=(dup.data||[]).length>0;
    // Un file con lo stesso hash è sempre uno storico duplicato. Non deve
    // tornare attivo neppure durante un aggiornamento, altrimenti i valori
    // vengono temporaneamente raddoppiati o sostituiscono campagne diverse.
    const repairDuplicate=duplicateFound&&options.repairDuplicate===true;
    const isDuplicate=duplicateFound&&!repairDuplicate;

    const filePayload={
      report_type:reportType,
      file_name:fileName,
      fingerprint,
      row_count:rows.length,
      column_count:headers.length,
      headers,
      delimiter,
      source:repairDuplicate?{...(source||{}),reparsed:true,reparsed_from_file_ids:(dup.data||[]).map(x=>x.id)}:(source||{}),
      is_duplicate:isDuplicate,
      imported_at:new Date().toISOString()
    };

    const insFile=await db.from("bb100_report_files").insert([filePayload]).select().single();
    if(insFile.error) throw new Error(insFile.error.message);

    const logPayload={...filePayload,file_id:insFile.data.id,success:true,error_message:null};
    const insLog=await db.from("bb100_import_log").insert([logPayload]);
    if(insLog.error) throw new Error(insLog.error.message);

    if(!isDuplicate && rows.length){
      for(let i=0;i<rows.length;i+=500){
        const chunk=rows.slice(i,i+500).map((row,j)=>({
          file_id:insFile.data.id,
          report_type:reportType,
          file_name:fileName,
          row_index:i+j+1,
          row_data:row,
          fingerprint,
          source:source||{}
        }));
        const insRows=await db.from("bb100_raw_rows").insert(chunk);
        if(insRows.error) throw new Error(insRows.error.message);
      }
    }

    if(repairDuplicate){
      for(const previous of (dup.data||[])){
        const old=await db.from("bb100_report_files").update({is_duplicate:true}).eq("id",previous.id);
        if(old.error) throw new Error(old.error.message);
      }
    }

    return {isDuplicate,repaired:repairDuplicate,file:insFile.data,duplicateFile:(dup.data||[])[0]||null};
  },
  async deleteTypeExcept(reportType,keepFileIds=[]){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const keep=new Set((keepFileIds||[]).map(id=>String(id)));
    const r=await db.from("bb100_report_files").select("id,file_name").eq("report_type",reportType);
    if(r.error) throw new Error(r.error.message);
    const oldFiles=(r.data||[]).filter(file=>!keep.has(String(file.id)));
    for(const file of oldFiles) await this.deleteFile(file.id);
    return oldFiles;
  },
  async listFiles(){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.from("bb100_report_files").select("*").order("imported_at",{ascending:false}).limit(1000);
    if(r.error) throw new Error(r.error.message);
    return r.data||[];
  },
  async countType(type){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.from("bb100_raw_rows").select("id",{count:"exact",head:true}).eq("report_type",type);
    if(r.error) throw new Error(r.error.message);
    return r.count||0;
  },
  async rawRows(type){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const pageSize=1000;
    const rows=[];
    for(let from=0;;from+=pageSize){
      const to=from+pageSize-1;
      const r=await db.from("bb100_raw_rows")
        .select("file_id,report_type,file_name,row_index,row_data,fingerprint,source,imported_at")
        .eq("report_type",type)
        .order("imported_at",{ascending:true})
        .order("row_index",{ascending:true})
        .range(from,to);
      if(r.error) throw new Error(r.error.message);
      const page=r.data||[];
      rows.push(...page);
      if(page.length<pageSize) break;
    }
    return rows;
  },
  async resolved(type,files){
    const records=await this.rawRows(type);
    return BBReconcile.resolve(type,files||[],records);
  },
  async sample(type){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.from("bb100_raw_rows").select("row_data,file_name,source").eq("report_type",type).limit(20000);
    if(r.error) throw new Error(r.error.message);
    return (r.data||[]).map(x=>({...x.row_data,__file_name:x.file_name,__source:x.source}));
  },
  async deleteFile(fileId){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const delRows=await db.from("bb100_raw_rows").delete().eq("file_id",fileId);
    if(delRows.error) throw new Error(delRows.error.message);
    const delLog=await db.from("bb100_import_log").delete().eq("file_id",fileId);
    if(delLog.error) throw new Error(delLog.error.message);
    const delFile=await db.from("bb100_report_files").delete().eq("id",fileId);
    if(delFile.error) throw new Error(delFile.error.message);
  },
  async operationalRows(){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.from("bb100_operational_data")
      .select("dataset,record_key,payload,source,created_at,updated_at")
      .is("deleted_at",null)
      .order("dataset",{ascending:true})
      .order("record_key",{ascending:true});
    if(r.error){
      if(r.error.code==="42P01" || /bb100_operational_data/i.test(r.error.message||"")) throw new Error("Schema Cloud Operativo non installato. Esegui sql/schema_v1_3_6_cloud_operational_data.sql in Supabase.");
      throw new Error(r.error.message);
    }
    return r.data||[];
  },
  async replaceOperationalDataset(dataset,records){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.rpc("bb100_replace_operational_dataset",{p_dataset:dataset,p_records:records||[]});
    if(r.error) throw new Error(r.error.message);
    return r.data;
  },
};
