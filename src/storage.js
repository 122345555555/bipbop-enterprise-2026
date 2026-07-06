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
  async insertFile(reportType,fileName,headers,rows,fingerprint,source,delimiter){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");

    const dup=await db.from("bb70_report_files").select("id").eq("fingerprint",fingerprint).limit(1);
    if(dup.error) throw new Error(dup.error.message);
    const isDuplicate=(dup.data||[]).length>0;

    const filePayload={
      report_type:reportType,
      file_name:fileName,
      fingerprint,
      row_count:rows.length,
      column_count:headers.length,
      headers,
      delimiter,
      source:source||{},
      is_duplicate:isDuplicate,
      imported_at:new Date().toISOString()
    };

    const insFile=await db.from("bb70_report_files").insert([filePayload]).select().single();
    if(insFile.error) throw new Error(insFile.error.message);

    const logPayload={...filePayload,file_id:insFile.data.id,success:true,error_message:null};
    const insLog=await db.from("bb70_import_log").insert([logPayload]);
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
        const insRows=await db.from("bb70_raw_rows").insert(chunk);
        if(insRows.error) throw new Error(insRows.error.message);
      }
    }

    return {isDuplicate,file:insFile.data};
  },
  async listFiles(){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.from("bb70_report_files").select("*").order("imported_at",{ascending:false}).limit(1000);
    if(r.error) throw new Error(r.error.message);
    return r.data||[];
  },
  async countType(type){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.from("bb70_raw_rows").select("id",{count:"exact",head:true}).eq("report_type",type);
    if(r.error) throw new Error(r.error.message);
    return r.count||0;
  },
  async sample(type){
    const db=this.client();
    if(!db) throw new Error("Supabase non configurato.");
    const r=await db.from("bb70_raw_rows").select("row_data,file_name,source").eq("report_type",type).limit(20000);
    if(r.error) throw new Error(r.error.message);
    return (r.data||[]).map(x=>({...x.row_data,__file_name:x.file_name,__source:x.source}));
  }
};
