(function(){
"use strict";

const state={files:[],counts:{},samples:{},errors:[]};
BBRender.setState(state);

function show(view){
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id===view));
  const active=document.querySelector('.nav[data-view="'+view+'"]');
  if(active) BBUtils.el("pageTitle").textContent=active.textContent.replace(/[📊📥💶📈📦🔎🏷️💰🚀🧠🚨📁🧪⚙️]/g,"").trim();
}

async function importFiles(files){
  const lines=[];
  for(const file of files){
    try{
      const buffer=await file.arrayBuffer();
      const text=BBParser.decodeArrayBuffer(buffer);
      const parsed=BBParser.parse(text);
      const reportType=BBParser.detectReport(parsed.headers,file.name);
      if(reportType==="unknown"){
        lines.push("⚠️ "+file.name+": tipo report non riconosciuto. Colonne rilevate: "+parsed.headers.length+".");
        continue;
      }
      const fingerprint=await BBUtils.sha256(text);
      const source=BBParser.sourceFrom(reportType,file.name,parsed.headers);
      const result=await BBStorage.insertFile(reportType,file.name,parsed.headers,parsed.rows,fingerprint,source,parsed.delimiter);
      if(result.isDuplicate){
        lines.push("⚠️ "+file.name+": duplicato già presente. Salvato in archivio ma NON sommato.");
      }else{
        lines.push("✅ "+file.name+": "+BBAnalytics.label(reportType)+", "+parsed.rows.length+" righe, "+parsed.headers.length+" colonne, separatore "+(parsed.delimiter==="\\t"?"TAB":parsed.delimiter)+".");
      }
    }catch(e){
      state.errors.push(String(e.message||e));
      lines.push("❌ "+file.name+": "+(e.message||e));
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
  BBUtils.el("saveRules").addEventListener("click",()=>{
    localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({
      tacos:BBUtils.num(BBUtils.el("ruleTacos").value),
      acos:BBUtils.num(BBUtils.el("ruleAcos").value),
      margin:BBUtils.num(BBUtils.el("ruleMargin").value)
    }));
    alert("Regole salvate");
    BBRender.renderAll();
  });
}

document.addEventListener("DOMContentLoaded",()=>{bind();BBRender.renderAll();refresh();});
})();
