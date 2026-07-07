(function(){
"use strict";

const state={files:[],counts:{},samples:{},errors:[]};
BBRender.setState(state);

function show(view){
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id===view));
  const active=document.querySelector('.nav[data-view="'+view+'"]');
  if(active) BBUtils.el("pageTitle").textContent=active.textContent.replace(/[📊📥💶📈📦📋🏬🔎🏷️💰🚀🧠🚨📁🧪⚙️]/g,"").trim();
}

async function importFiles(files){
  const lines=[];
  const forcedType=BBUtils.el("reportTypeOverride")?.value || "";
  for(const file of files){
    const safeFileName=BBUtils.html(file.name);
    try{
      const buffer=await file.arrayBuffer();
      const text=BBParser.decodeArrayBuffer(buffer);
      const parsed=BBParser.parse(text);
      const detectedType=BBParser.detectReport(parsed.headers,file.name);
      const reportType=forcedType || detectedType;
      if(reportType==="unknown"){
        lines.push("⚠️ "+safeFileName+": tipo report non riconosciuto. Colonne rilevate: "+parsed.headers.length+".");
        continue;
      }
      const fingerprint=await BBUtils.sha256(text);
      const source={
        ...BBParser.sourceFrom(reportType,file.name,parsed.headers),
        detected_type:detectedType,
        forced_type:forcedType || null,
        header_index:parsed.headerIndex
      };
      const result=await BBStorage.insertFile(reportType,file.name,parsed.headers,parsed.rows,fingerprint,source,parsed.delimiter);
      const placement=forcedType
        ? "forzato in "+BBUtils.html(BBAnalytics.label(reportType))+" (automatico: "+BBUtils.html(BBAnalytics.label(detectedType))+")"
        : "rilevato come "+BBUtils.html(BBAnalytics.label(reportType));
      if(result.isDuplicate){
        const existing=result.duplicateFile;
        const existingInfo=existing
          ? " Era già stato caricato come "+BBUtils.html(existing.file_name)+" ("+BBUtils.html(existing.row_count)+" righe)."
          : "";
        lines.push("ℹ️ "+safeFileName+": riconosciuto correttamente come "+BBUtils.html(BBAnalytics.label(reportType))+", ma è un duplicato."+existingInfo+" Non lo sommo di nuovo per evitare dati doppi.");
      }else{
        lines.push("✅ "+safeFileName+": "+placement+", "+parsed.rows.length+" righe, "+parsed.headers.length+" colonne, separatore "+BBUtils.html(parsed.delimiter==="\\t"?"TAB":parsed.delimiter)+".");
      }
    }catch(e){
      state.errors.push(String(e.message||e));
      lines.push("❌ "+safeFileName+": "+BBUtils.html(e.message||e));
    }
  }
  BBUtils.el("importLog").innerHTML=lines.map(x=>"<div>"+x+"</div>").join("");
  await refresh();
}

async function refresh(){
  try{
    const cfg=BBStorage.config();
    BBUtils.el("cloudBadge").textContent=cfg.url&&cfg.key?"Cloud configurato":"Cloud non collegato";
    BBUtils.el("cloudBadge").className="badge "+(cfg.url&&cfg.key?"ok":"bad");
    if(!cfg.url||!cfg.key){ BBRender.renderAll(); return; }

    state.files=await BBStorage.listFiles();
    state.counts={}; state.samples={};
    for(const def of BBAnalytics.reportDefs){
      const type=def[0];
      state.counts[type]=await BBStorage.countType(type);
      if(state.counts[type]>0) state.samples[type]=await BBStorage.sample(type);
    }
    BBRender.renderAll();
  }catch(e){
    state.errors.push(String(e.message||e));
    BBRender.renderAll();
  }
}

function bind(){
  document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>show(b.dataset.view)));
  BBUtils.el("refreshBtn").addEventListener("click",refresh);
  BBUtils.el("selectFilesBtn").addEventListener("click",()=>BBUtils.el("multiFile").click());
  BBUtils.el("multiFile").addEventListener("change",e=>importFiles(Array.from(e.target.files)));
  BBUtils.el("clearImportLogBtn").addEventListener("click",()=>BBUtils.el("importLog").textContent="Pronto.");
  BBUtils.el("archiveTable").addEventListener("click",async e=>{
    const btn=e.target.closest(".deleteFileBtn");
    if(!btn) return;
    const fileName=btn.dataset.fileName || "questo file";
    if(!confirm("Eliminare "+fileName+" dall'archivio e dai dati attivi?")) return;
    try{
      await BBStorage.deleteFile(btn.dataset.fileId);
      BBUtils.el("importLog").innerHTML="<div>✅ "+BBUtils.html(fileName)+": eliminato. Ora puoi ricaricarlo scegliendo la destinazione corretta.</div>";
      await refresh();
    }catch(err){
      state.errors.push(String(err.message||err));
      BBRender.renderAll();
    }
  });

  ["inventorySearch","inventoryFilter","inventoryLowStock","inventorySort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener(id==="inventorySearch"?"input":"change",()=>BBRender.renderAll());
  });
  BBUtils.el("inventoryReset")?.addEventListener("click",()=>{
    BBUtils.el("inventorySearch").value="";
    BBUtils.el("inventoryFilter").value="all";
    BBUtils.el("inventoryLowStock").value="10";
    BBUtils.el("inventorySort").value="title";
    BBRender.renderAll();
  });
  ["keywordSearch","keywordFilter","keywordMinClicks","keywordSort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener(id==="keywordSearch"?"input":"change",()=>BBRender.renderAll());
  });
  BBUtils.el("keywordReset")?.addEventListener("click",()=>{
    BBUtils.el("keywordSearch").value="";
    BBUtils.el("keywordFilter").value="all";
    BBUtils.el("keywordMinClicks").value="0";
    BBUtils.el("keywordSort").value="priority";
    BBRender.renderAll();
  });
  ["profitYearFilter","profitSort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener("change",()=>BBRender.renderAll());
  });
  BBUtils.el("profitReset")?.addEventListener("click",()=>{
    BBUtils.el("profitYearFilter").value="all";
    BBUtils.el("profitSort").value="sales_desc";
    BBRender.renderAll();
  });
  ["asinSearch","asinDecisionFilter","asinSort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener(id==="asinSearch"?"input":"change",()=>BBRender.renderAll());
  });
  BBUtils.el("asinReset")?.addEventListener("click",()=>{
    BBUtils.el("asinSearch").value="";
    BBUtils.el("asinDecisionFilter").value="all";
    BBUtils.el("asinSort").value="profit_desc";
    BBRender.renderAll();
  });

  const dz=BBUtils.el("dropZone");
  dz.addEventListener("click",()=>BBUtils.el("multiFile").click());
  ["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("drag");}));
  ["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("drag");}));
  dz.addEventListener("drop",e=>{
    const files=Array.from(e.dataTransfer.files).filter(f=>f.name.toLowerCase().match(/\.(csv|txt|tsv)$/));
    importFiles(files);
  });

  const cfg=BBStorage.config();
  BBUtils.el("supabaseUrl").value=cfg.url||"";
  BBUtils.el("supabaseKey").value=cfg.key||"";
  BBUtils.el("saveSetup").addEventListener("click",()=>{
    BBStorage.saveConfig({url:BBUtils.el("supabaseUrl").value.trim(),key:BBUtils.el("supabaseKey").value.trim()});
    alert("Configurazione salvata");
    refresh();
  });

  const ru=BBUtils.rules();
  BBUtils.el("ruleTacos").value=ru.tacos;
  BBUtils.el("ruleAcos").value=ru.acos;
  BBUtils.el("ruleMargin").value=ru.margin;
  BBUtils.el("ruleMonthlyFee").value=ru.monthlyFee;
  BBUtils.el("ruleSubscriptionMonths").value=ru.subscriptionMonths;
  BBUtils.el("ruleProductionCost").value=ru.productionCostPerUnit;
  BBUtils.el("ruleShippingCost").value=ru.shippingCostPerUnit;
  BBUtils.el("ruleExtraFixedCosts").value=ru.extraFixedCosts;
  BBUtils.el("saveRules").addEventListener("click",()=>{
    localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({
      tacos:BBUtils.num(BBUtils.el("ruleTacos").value),
      acos:BBUtils.num(BBUtils.el("ruleAcos").value),
      margin:BBUtils.num(BBUtils.el("ruleMargin").value),
      monthlyFee:BBUtils.num(BBUtils.el("ruleMonthlyFee").value),
      subscriptionMonths:BBUtils.num(BBUtils.el("ruleSubscriptionMonths").value),
      productionCostPerUnit:BBUtils.num(BBUtils.el("ruleProductionCost").value),
      shippingCostPerUnit:BBUtils.num(BBUtils.el("ruleShippingCost").value),
      extraFixedCosts:BBUtils.num(BBUtils.el("ruleExtraFixedCosts").value)
    }));
    alert("Regole salvate");
    BBRender.renderAll();
  });
}

document.addEventListener("DOMContentLoaded",()=>{bind();BBRender.renderAll();refresh();});
})();
