(function(){
window.BipBopSupabase={
  getConfig(){return JSON.parse(localStorage.getItem(window.BIPBOP_CONFIG.storageKey)||"{}")},
  saveConfig(c){localStorage.setItem(window.BIPBOP_CONFIG.storageKey,JSON.stringify(c))},
  getClient(){const c=this.getConfig();return c.url&&c.key&&window.supabase?window.supabase.createClient(c.url,c.key):null},
  async replaceTable(table,rows){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    const del=await s.from(table).delete().neq("id","00000000-0000-0000-0000-000000000000");
    if(del.error)throw new Error(table+" delete: "+del.error.message);
    if(rows.length){
      const ins=await s.from(table).insert(rows);
      if(ins.error)throw new Error(table+" insert: "+ins.error.message);
    }
  },
  async clearAll(){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    for(const t of ["bb13_transactions","bb13_ad_invoices","bb13_ads_campaigns","bb13_search_terms","bb13_business_report","bb13_inventory","bb13_costs"]){
      const r=await s.from(t).delete().neq("id","00000000-0000-0000-0000-000000000000");
      if(r.error)throw new Error(t+": "+r.error.message);
    }
  },
  async loadAll(){
    const s=this.getClient(); if(!s)throw new Error("Supabase non configurato.");
    const out={};
    for(const t of ["bb13_transactions","bb13_ad_invoices","bb13_ads_campaigns","bb13_search_terms","bb13_business_report","bb13_inventory","bb13_costs"]){
      const r=await s.from(t).select("*").limit(20000);
      if(r.error)throw new Error(t+": "+r.error.message);
      out[t]=r.data||[];
    }
    return out;
  }
};
})();