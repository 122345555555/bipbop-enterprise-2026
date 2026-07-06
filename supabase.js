(function(){
window.BipBopSupabase={
  getConfig(){return JSON.parse(localStorage.getItem(window.BIPBOP_CONFIG.storageKey)||"{}")},
  saveConfig(c){localStorage.setItem(window.BIPBOP_CONFIG.storageKey,JSON.stringify(c))},
  getClient(){const c=this.getConfig();return c.url&&c.key&&window.supabase?window.supabase.createClient(c.url,c.key):null},

  async replaceReport(type,fileName,headers,rows){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    const del=await s.from("bb_enterprise_raw_reports").delete().eq("report_type",type);
    if(del.error)throw new Error("delete report: "+del.error.message);

    const meta={report_type:type,file_name:fileName,row_count:rows.length,headers,imported_at:new Date().toISOString()};
    const insMeta=await s.from("bb_enterprise_import_log").insert([meta]);
    if(insMeta.error)throw new Error("import log: "+insMeta.error.message);

    for(let i=0;i<rows.length;i+=500){
      const payload=rows.slice(i,i+500).map((row,j)=>({
        report_type:type,
        file_name:fileName,
        row_index:i+j+1,
        row_data:row
      }));
      const ins=await s.from("bb_enterprise_raw_reports").insert(payload);
      if(ins.error)throw new Error("insert rows: "+ins.error.message);
    }
  },

  async listReports(){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    const r=await s.from("bb_enterprise_import_log").select("*").order("imported_at",{ascending:false}).limit(200);
    if(r.error)throw new Error(r.error.message);
    return r.data||[];
  },

  async countReport(type){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    const r=await s.from("bb_enterprise_raw_reports").select("id",{count:"exact",head:true}).eq("report_type",type);
    if(r.error)throw new Error(r.error.message);
    return r.count||0;
  },

  async sampleReport(type,limit=1000){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    const r=await s.from("bb_enterprise_raw_reports").select("row_data").eq("report_type",type).limit(limit);
    if(r.error)throw new Error(r.error.message);
    return (r.data||[]).map(x=>x.row_data);
  },

  async clearReport(type){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    const r=await s.from("bb_enterprise_raw_reports").delete().eq("report_type",type);
    if(r.error)throw new Error(r.error.message);
  }
};
})();