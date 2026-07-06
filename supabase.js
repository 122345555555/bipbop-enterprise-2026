window.BipBopDB = {
  config() {
    try { return JSON.parse(localStorage.getItem(window.BIPBOP_CONFIG.storageKey) || "{}"); } catch(e) { return {}; }
  },
  saveConfig(cfg) { localStorage.setItem(window.BIPBOP_CONFIG.storageKey, JSON.stringify(cfg || {})); },
  client() {
    const cfg = this.config();
    if (!cfg.url || !cfg.key || !window.supabase) return null;
    return window.supabase.createClient(cfg.url, cfg.key);
  },
  async insertReport(type, fileName, headers, rows, fingerprint, source) {
    const db = this.client();
    if (!db) throw new Error("Supabase non configurato.");
    const dup = await db.from("bb60_import_log").select("id").eq("fingerprint", fingerprint).limit(1);
    if (dup.error) throw new Error(dup.error.message);
    const isDuplicate = (dup.data || []).length > 0;

    const meta = {
      report_type:type,
      file_name:fileName,
      row_count:rows.length,
      headers,
      fingerprint,
      is_duplicate:isDuplicate,
      source: source || {},
      imported_at:new Date().toISOString()
    };

    const insLog = await db.from("bb60_import_log").insert([meta]).select().single();
    if (insLog.error) throw new Error(insLog.error.message);

    if (!isDuplicate) {
      for (let i=0;i<rows.length;i+=500) {
        const chunk = rows.slice(i,i+500).map((row,j)=>({
          report_type:type,
          file_name:fileName,
          row_index:i+j+1,
          row_data:row,
          fingerprint,
          source: source || {}
        }));
        const insRows = await db.from("bb60_raw_reports").insert(chunk);
        if (insRows.error) throw new Error(insRows.error.message);
      }
    }
    return { isDuplicate };
  },
  async listLog() {
    const db = this.client();
    if (!db) throw new Error("Supabase non configurato.");
    const r = await db.from("bb60_import_log").select("*").order("imported_at", { ascending:false }).limit(800);
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  },
  async countType(type) {
    const db = this.client();
    if (!db) throw new Error("Supabase non configurato.");
    const r = await db.from("bb60_raw_reports").select("id", { count:"exact", head:true }).eq("report_type", type);
    if (r.error) throw new Error(r.error.message);
    return r.count || 0;
  },
  async sample(type) {
    const db = this.client();
    if (!db) throw new Error("Supabase non configurato.");
    const r = await db.from("bb60_raw_reports").select("row_data,file_name,source").eq("report_type", type).limit(20000);
    if (r.error) throw new Error(r.error.message);
    return (r.data || []).map(x => ({...x.row_data, __file_name:x.file_name, __source:x.source}));
  }
};