(function () {
"use strict";

const REPORTS = [
  { type:"business_report", name:"Business Report", need:"obbligatorio", keys:["ordered product sales","sessions","unit session percentage","asin","sku"] },
  { type:"transactions", name:"Transazioni / pagamenti", need:"obbligatorio", keys:["stato della transazione","tipo di transazione","numero di ordine","commissioni amazon","totale (eur)"] },
  { type:"ad_invoices", name:"Fatture Ads", need:"obbligatorio", keys:["invoice","fattura","paid amount","importo pagato","advertising"] },
  { type:"sponsored_products", name:"Sponsored Products", need:"consigliato", keys:["campaign name","nome campagna","spend","spesa","costo totale","sales","vendite","acos","impressions","impressioni","clicks","clic"] },
  { type:"sponsored_brands", name:"Sponsored Brands", need:"consigliato", keys:["nome del gruppo di annunci","nome dell'annuncio","target","impressioni visualizzabili","costo pubblicitario delle vendite","roas","acquisti nuovi clienti","vendite nuovi clienti"] },
  { type:"sponsored_display", name:"Sponsored Display", need:"opzionale", keys:["sponsored display","views","detail page views","viewable impressions","impressions","clicks","spend"] },
  { type:"search_terms", name:"Search Terms", need:"consigliato", keys:["customer search term","search term","termine di ricerca","keyword","parola chiave","clicks","clic","spend","spesa"] },
  { type:"orders", name:"Report ordini", need:"consigliato", keys:["order-id","purchase-date","sku","quantity-purchased"] },
  { type:"inventory", name:"Inventario", need:"consigliato", keys:["sku","available","inventory","fulfillable"] }
];

const state = { log: [], counts: {}, samples: {}, latest: {}, errors: [] };

function el(id){return document.getElementById(id)}
function low(s){return String(s||"").toLowerCase().trim()}
function flatName(s){return low(s).replace(/[_\\-]+/g," ")}
function euro(v){return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v||0))}
function num(v){if(v===null||v===undefined||v==="")return 0;let s=String(v).replace(/\\u00a0/g," ").replace(/€/g,"").replace(/\\s/g,"").trim();if(s.includes(",")&&s.includes("."))s=s.replace(/\\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");const m=s.match(/-?\\d+(\\.\\d+)?/);return m?Number(m[0]):0}
function pct(v){return Number.isFinite(v)?v.toFixed(1)+"%":"—"}
function label(t){const r=REPORTS.find(x=>x.type===t);return r?r.name:t}
function rules(){try{return JSON.parse(localStorage.getItem(window.BIPBOP_CONFIG.rulesKey)||'{"tacos":15,"acos":35,"margin":25}')}catch(e){return{tacos:15,acos:35,margin:25}}}
function saveRules(){localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({tacos:num(el("ruleTacos").value),acos:num(el("ruleAcos").value),margin:num(el("ruleMargin").value)}));alert("Regole salvate");render()}

function pick(row,names){
  const keys=Object.keys(row||{});
  for(const name of names){
    const f=keys.find(k=>low(k)===low(name));
    if(f&&row[f]!==""&&row[f]!==null&&row[f]!==undefined)return row[f];
  }
  for(const name of names){
    const f=keys.find(k=>low(k).includes(low(name)));
    if(f&&row[f]!==""&&row[f]!==null&&row[f]!==undefined)return row[f];
  }
  return "";
}

function parseCSV(text){
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],nx=text[i+1];
    if(c=='"'&&q&&nx=='"'){cur+='"';i++;continue}
    if(c=='"'){q=!q;continue}
    if(c==","&&!q){row.push(cur);cur="";continue}
    if((c=="\\n"||c=="\\r")&&!q){
      if(c=="\\r"&&nx=="\\n")i++;
      row.push(cur);cur="";
      if(row.some(x=>String(x).trim()!==""))rows.push(row);
      row=[];continue
    }
    cur+=c
  }
  row.push(cur);
  if(row.some(x=>String(x).trim()!==""))rows.push(row);
  if(!rows.length)return{headers:[],data:[]};
  let hi=0,max=0;
  rows.forEach((r,i)=>{if(r.length>max){max=r.length;hi=i}});
  const headers=rows[hi].map((h,i)=>String(h||"").trim()||("col_"+(i+1)));
  const data=rows.slice(hi+1).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]||"");return o}).filter(o=>Object.values(o).some(v=>String(v).trim()!==""));
  return{headers,data}
}

function readFile(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||""));r.onerror=()=>rej(r.error);r.readAsText(file,"UTF-8")})}
async function hashText(text){const data=new TextEncoder().encode(text);const hash=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("")}

function hasAll(header,terms){return terms.every(t=>header.includes(low(t)))}
function hasAny(header,terms){return terms.some(t=>header.includes(low(t)))}

function detect(headers,fileName){
  const h=headers.map(low).join(" | ");
  const fn=flatName(fileName);

  if(hasAny(h,["stato della transazione","tipo di transazione","numero di ordine","commissioni amazon","totale (eur)"])) return "transactions";
  if(hasAny(h,["ordered product sales","unit session percentage","sessions - total","unità ordinate","vendite prodotto ordinate"])) return "business_report";
  if(hasAny(h,["invoice","fattura","importo pagato","paid amount"]) && hasAny(h,["advertising","pubblicità","ads"])) return "ad_invoices";
  if(hasAny(h,["order-id","purchase-date","quantity-purchased"])) return "orders";
  if(hasAny(h,["fulfillable","available","afn","mfn"]) && h.includes("sku")) return "inventory";
  if(hasAny(h,["customer search term","termine di ricerca","search term"])) return "search_terms";

  const looksLikeAds = hasAny(h,["impressioni","impressions"]) && hasAny(h,["clic","clicks"]) && hasAny(h,["costo totale","spend","cost","spesa"]);
  const looksLikeSBAdGroup = hasAny(h,["nome del gruppo di annunci","ad group name"]) && hasAny(h,["nome dell'annuncio","ad name"]) && hasAny(h,["target"]) && hasAny(h,["acquisti","orders","roas"]);
  if(looksLikeSBAdGroup) return "sponsored_brands";

  if(looksLikeAds){
    if(fn.includes("sponsored brands") || fn.includes("sponsored brand") || fn.includes("brands")) return "sponsored_brands";
    if(fn.includes("sponsored products") || fn.includes("sponsored product") || fn.includes("products")) return "sponsored_products";
    if(fn.includes("sponsored display") || fn.includes("display")) return "sponsored_display";
    return "sponsored_products";
  }

  let best={type:"unknown",score:0};
  REPORTS.forEach(r=>{
    let s=0;
    r.keys.forEach(k=>{if(h.includes(low(k)))s++});
    if(s>best.score)best={type:r.type,score:s}
  });
  return best.score>=2?best.type:"unknown";
}

function sourceFrom(type,fileName,headers){
  const fn=flatName(fileName);
  let channel="";
  if(type==="sponsored_brands") channel="Sponsored Brands";
  if(type==="sponsored_products") channel="Sponsored Products";
  if(type==="sponsored_display") channel="Sponsored Display";
  let level="file";
  if(fn.includes("ad group") || fn.includes("ad groups")) level="ad_group";
  if(fn.includes("campaign")) level="campaign";
  if(fn.includes("keyword")) level="keyword";
  if(fn.includes("search term")) level="search_term";
  if(fn.includes("target")) level="target";
  return {channel,level,original_file:fileName};
}

async function importFiles(files){
  const lines=[];
  for(const file of files){
    try{
      const text=await readFile(file);
      const parsed=parseCSV(text);
      const type=detect(parsed.headers,file.name);
      if(type==="unknown"){lines.push("⚠️ "+file.name+": tipo report non riconosciuto.");continue}
      const fp=await hashText(text);
      const src=sourceFrom(type,file.name,parsed.headers);
      const r=await window.BipBopDB.insertReport(type,file.name,parsed.headers,parsed.data,fp,src);
      if(r.isDuplicate){
        lines.push("⚠️ "+file.name+": duplicato già presente. Non sommato nei dati attivi.");
      }else{
        lines.push("✅ "+file.name+": "+label(type)+", "+parsed.data.length+" righe, "+parsed.headers.length+" colonne.");
      }
    }catch(err){
      lines.push("❌ "+file.name+": "+(err.message||err));state.errors.push(String(err.message||err))
    }
  }
  el("importLog").innerHTML=lines.map(x=>"<div>"+x+"</div>").join("");
  await refresh()
}

function calc(){
  const br=state.samples.business_report||[],tx=state.samples.transactions||[],adInv=state.samples.ad_invoices||[];
  const adsRows=[...(state.samples.sponsored_products||[]),...(state.samples.sponsored_brands||[]),...(state.samples.sponsored_display||[])];
  const orders=state.samples.orders||[];

  const brSales=br.reduce((a,r)=>a+num(pick(r,["Ordered Product Sales","Vendite prodotto ordinate","Sales","Vendite"])),0);
  const txTotal=tx.reduce((a,r)=>a+num(pick(r,["Totale (EUR)","Total (EUR)","Total","Totale"])),0);
  const sales=brSales||Math.max(txTotal,0);
  const units=br.reduce((a,r)=>a+num(pick(r,["Units Ordered","Unità ordinate","Units","Quantità"])),0)||orders.reduce((a,r)=>a+num(pick(r,["quantity-purchased","Quantity","Quantità"])),0);
  const sessions=br.reduce((a,r)=>a+num(pick(r,["Sessions","Sessioni"])),0);
  const amazonFees=tx.reduce((a,r)=>a+num(pick(r,["Commissioni Amazon","Amazon fees","commissioni"])),0);
  const adsInvoice=adInv.reduce((a,r)=>a+num(pick(r,["Importo pagato (convertito)","Paid Amount","Amount Paid","Totale","Total","Importo"])),0);
  const adsSpend=adsRows.reduce((a,r)=>a+num(pick(r,["Spend","Spesa","Cost","Costo","Costo totale"])),0);
  const adsSales=adsRows.reduce((a,r)=>a+num(pick(r,["Sales","Vendite","7 Day Total Sales","14 Day Total Sales"])),0);
  const clicks=adsRows.reduce((a,r)=>a+num(pick(r,["Clicks","Clic","Click"])),0);
  const impressions=adsRows.reduce((a,r)=>a+num(pick(r,["Impressions","Impressioni"])),0);
  const ads=adsInvoice||adsSpend;
  const profit=sales+amazonFees-ads;
  return{sales,units,sessions,amazonFees,ads,adsSales,clicks,impressions,profit,tacos:sales?ads/sales*100:NaN,acos:adsSales?ads/adsSales*100:NaN,roas:ads?adsSales/ads:NaN,ctr:impressions?clicks/impressions*100:NaN,cpc:clicks?ads/clicks:NaN,margin:sales?profit/sales*100:NaN,conversion:sessions?units/sessions*100:NaN}
}

function recs(c){
  const r=rules(),out=[];
  if(!state.counts.business_report)out.push(["red","Importa Business Report","Serve per sessioni, conversione, vendite per ASIN."]);
  if(!state.counts.transactions)out.push(["red","Importa Transazioni","Serve per commissioni Amazon e totale economico reale."]);
  if(!state.counts.ad_invoices)out.push(["yellow","Importa Fatture Ads","Serve per la spesa Ads reale fatturata."]);
  if(Number.isFinite(c.tacos)&&c.tacos>r.tacos)out.push(["red","TACOS alto","TACOS "+pct(c.tacos)+" sopra target "+r.tacos+"%."]);
  if(Number.isFinite(c.acos)&&c.acos>r.acos)out.push(["red","ACOS alto","ACOS "+pct(c.acos)+" sopra target "+r.acos+"%."]);
  if(Number.isFinite(c.ctr)&&c.ctr<0.25)out.push(["yellow","CTR basso","CTR "+pct(c.ctr)+": migliora creatività o pertinenza keyword."]);
  if(!out.length)out.push(["green","Base dati buona","Puoi iniziare ottimizzazione avanzata."]);
  return out;
}

function asinRows(){
  const br=state.samples.business_report||[],tx=state.samples.transactions||[];
  const map=new Map();
  br.forEach(r=>{
    const asin=pick(r,["ASIN","Parent ASIN","Child ASIN"])||"N/D";
    const title=pick(r,["Title","Titolo","Product Name","Nome prodotto"])||"";
    const o=map.get(asin)||{asin,title,sales:0,units:0,sessions:0,cr:0};
    o.sales+=num(pick(r,["Ordered Product Sales","Sales","Vendite prodotto ordinate","Vendite"]));
    o.units+=num(pick(r,["Units Ordered","Unità ordinate","Units","Quantità"]));
    o.sessions+=num(pick(r,["Sessions","Sessioni"]));
    o.cr=Math.max(o.cr,num(pick(r,["Unit Session Percentage","Conversion Rate","Tasso conversione"])));
    map.set(asin,o)
  });
  tx.forEach(r=>{
    const d=pick(r,["Dettagli prodotto","Product Details","Title"])||"";
    const m=String(d).match(/B0[A-Z0-9]{8}/);
    const asin=m?m[0]:"N/D";
    const o=map.get(asin)||{asin,title:d,sales:0,units:0,sessions:0,cr:0};
    o.sales+=Math.max(num(pick(r,["Totale (EUR)","Total (EUR)","Totale"])),0);
    map.set(asin,o)
  });
  return Array.from(map.values()).sort((a,b)=>b.sales-a.sales).slice(0,100)
}

function keywordRows(){
  const st=state.samples.search_terms||[];
  return st.map(r=>{
    const term=pick(r,["Customer Search Term","Search Term","Termine di ricerca","Keyword","Parola chiave"])||"";
    const spend=num(pick(r,["Spend","Spesa","Cost","Costo","Costo totale"]));
    const sales=num(pick(r,["Sales","Vendite","7 Day Total Sales","14 Day Total Sales"]));
    const clicks=num(pick(r,["Clicks","Clic","Click"]));
    return{term,spend,sales,clicks,acos:sales?spend/sales*100:NaN}
  }).filter(x=>x.term).sort((a,b)=>b.spend-a.spend).slice(0,100)
}

async function refresh(){
  try{
    const cfg=window.BipBopDB.config();
    el("cloudBadge").textContent=cfg.url&&cfg.key?"Cloud configurato":"Cloud non collegato";
    el("cloudBadge").className="badge "+(cfg.url&&cfg.key?"ok":"bad");
    if(!cfg.url||!cfg.key){render();return}
    state.log=await window.BipBopDB.listLog();
    state.counts={};state.samples={};state.latest={};
    for(const r of REPORTS){
      state.counts[r.type]=await window.BipBopDB.countType(r.type);
      if(state.counts[r.type]>0)state.samples[r.type]=await window.BipBopDB.sample(r.type)
    }
    state.log.forEach(r=>{if(!state.latest[r.report_type])state.latest[r.report_type]=r});
    render()
  }catch(err){state.errors.push(String(err.message||err));render()}
}

function filesForType(type){return state.log.filter(x=>x.report_type===type && !x.is_duplicate)}
function render(){
  const c=calc(),rs=recs(c),imported=REPORTS.filter(r=>(state.counts[r.type]||0)>0).length,totalRows=Object.values(state.counts).reduce((a,b)=>a+(b||0),0);
  el("headline").textContent=imported?imported+" categorie report importate":"Centro di comando Amazon pronto";
  el("subline").textContent=imported?"I file dello stesso tipo vengono sommati, i duplicati esclusi.":"Importa i report Amazon per generare analisi e Growth Plan.";
  el("kpis").innerHTML=[["Vendite",c.sales?euro(c.sales):"—"],["Profitto",c.sales?euro(c.profit):"—"],["Margine",pct(c.margin)],["TACOS",pct(c.tacos)],["ACOS",pct(c.acos)],["ROAS",Number.isFinite(c.roas)?c.roas.toFixed(2):"—"],["Sessioni",c.sessions||"—"],["Conversione",pct(c.conversion)]].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("");
  el("dataHealth").innerHTML=REPORTS.map(r=>{const ok=(state.counts[r.type]||0)>0,fc=filesForType(r.type).length;return'<div class="action"><b>'+r.name+'</b><br>'+(ok?'<span class="status-ok">✓ importato</span> — '+fc+' file, '+state.counts[r.type]+' righe':'<span class="'+(r.need==="obbligatorio"?'status-missing':'status-warn')+'">'+(r.need==="obbligatorio"?'mancante obbligatorio':'mancante')+'</span>')+'</div>'}).join("");
  el("topActions").innerHTML=rs.slice(0,6).map(r=>'<div class="action '+r[0]+'"><b>'+r[1]+'</b><br>'+r[2]+'</div>').join("");
  el("statusGrid").innerHTML=REPORTS.map(r=>{const ok=(state.counts[r.type]||0)>0,l=state.latest[r.type],fc=filesForType(r.type).length;return'<div class="import-box '+(ok?'ok':'missing')+'"><h4>'+r.name+'</h4><p><span class="pill">'+r.need+'</span></p><b>Stato:</b> '+(ok?'🟢 Importato':'🔴 Mancante')+'<br><b>File attivi:</b> '+fc+'<br><b>Ultimo file:</b> '+(l?.file_name||'—')+'<br><b>Righe attive:</b> '+(state.counts[r.type]||0)+'<br><b>Colonne ultimo file:</b> '+(Array.isArray(l?.headers)?l.headers.length:'—')+'</div>'}).join("");
  el("archiveTable").innerHTML=state.log.length?'<table><tr><th>Report</th><th>File</th><th>Righe</th><th>Colonne</th><th>Duplicato</th><th>Importato</th></tr>'+state.log.map(r=>'<tr><td><span class="pill">'+label(r.report_type)+'</span></td><td>'+r.file_name+'</td><td>'+r.row_count+'</td><td>'+(Array.isArray(r.headers)?r.headers.length:'')+'</td><td>'+(r.is_duplicate?'<span class="pill red">sì, non sommato</span>':'<span class="pill green">no</span>')+'</td><td>'+new Date(r.imported_at).toLocaleString("it-IT")+'</td></tr>').join("")+'</table>':'<div class="action">Nessun report importato.</div>';
  el("salesBox").innerHTML='<div class="grid3">'+[["Vendite",c.sales?euro(c.sales):"—"],["Unità",c.units||"—"],["Sessioni",c.sessions||"—"],["Conversione",pct(c.conversion)],["Commissioni Amazon",euro(c.amazonFees)],["Profitto stimato",c.sales?euro(c.profit):"—"]].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>';
  el("adsBox").innerHTML='<div class="grid3">'+[["Spesa Ads",c.ads?euro(c.ads):"—"],["Vendite Ads",c.adsSales?euro(c.adsSales):"—"],["ACOS",pct(c.acos)],["ROAS",Number.isFinite(c.roas)?c.roas.toFixed(2):"—"],["CPC",Number.isFinite(c.cpc)?euro(c.cpc):"—"],["CTR",pct(c.ctr)]].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>';
  const activeAds=state.log.filter(x=>["sponsored_brands","sponsored_products","sponsored_display"].includes(x.report_type)&&!x.is_duplicate);
  el("adsFilesBox").innerHTML=activeAds.length?'<h3>File Ads attivi</h3><table><tr><th>Tipo</th><th>File</th><th>Righe</th></tr>'+activeAds.map(r=>'<tr><td>'+label(r.report_type)+'</td><td>'+r.file_name+'</td><td>'+r.row_count+'</td></tr>').join("")+'</table>':'';
  const ar=asinRows();
  el("asinBox").innerHTML=ar.length?'<table><tr><th>ASIN</th><th>Titolo</th><th>Vendite</th><th>Unità</th><th>Sessioni</th><th>Conv.</th></tr>'+ar.map(r=>'<tr><td>'+r.asin+'</td><td>'+r.title+'</td><td>'+euro(r.sales)+'</td><td>'+r.units+'</td><td>'+r.sessions+'</td><td>'+(r.cr?r.cr+"%":"—")+'</td></tr>').join("")+'</table>':'<div class="action">Importa Business Report o Transazioni.</div>';
  const kr=keywordRows();
  el("keywordsBox").innerHTML=kr.length?'<table><tr><th>Termine</th><th>Spesa</th><th>Vendite</th><th>Click</th><th>ACOS</th></tr>'+kr.map(r=>'<tr><td>'+r.term+'</td><td>'+euro(r.spend)+'</td><td>'+euro(r.sales)+'</td><td>'+r.clicks+'</td><td>'+pct(r.acos)+'</td></tr>').join("")+'</table>':'<div class="action">Importa Search Terms per vedere le keyword.</div>';
  el("growthBox").innerHTML='<div class="grid3">'+rs.map(r=>'<div class="action '+r[0]+'"><b>'+r[1]+'</b><br>'+r[2]+'</div>').join("")+'</div>';
  el("alertsBox").innerHTML=rs.map(r=>'<div class="action '+r[0]+'">🚨 <b>'+r[1]+'</b><br>'+r[2]+'</div>').join("");
  el("diagnosticBox").innerHTML='<div class="action"><b>SOLO TABELLE BB60 SCALABLE</b><br>Import log: '+state.log.length+'<br>Raw rows attive: '+totalRows+'<br>Report configurati: '+REPORTS.length+'<br>Storage: '+window.BIPBOP_CONFIG.storageKey+'</div>';
  el("errorBox").textContent=state.errors.length?state.errors.join("\\n"):"Nessun errore."
}

function show(view){
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id===view));
  const a=document.querySelector('.nav[data-view="'+view+'"]');
  if(a)el("pageTitle").textContent=a.textContent.replace(/[📊📥💶📈📦🔎🚀🚨📁🧪⚙️]/g,"").trim()
}

function bind(){
  document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>show(b.dataset.view)));
  el("refreshBtn").addEventListener("click",refresh);
  el("selectFilesBtn").addEventListener("click",()=>el("multiFile").click());
  el("multiFile").addEventListener("change",e=>importFiles(Array.from(e.target.files)));
  el("clearImportLogBtn").addEventListener("click",()=>el("importLog").textContent="Pronto.");
  const dz=el("dropZone");
  dz.addEventListener("click",()=>el("multiFile").click());
  ["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("drag")}));
  ["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("drag")}));
  dz.addEventListener("drop",e=>{const files=Array.from(e.dataTransfer.files).filter(f=>f.name.toLowerCase().match(/\\.(csv|txt)$/));importFiles(files)});
  const cfg=window.BipBopDB.config();
  el("supabaseUrl").value=cfg.url||"";el("supabaseKey").value=cfg.key||"";
  el("saveSetup").addEventListener("click",()=>{window.BipBopDB.saveConfig({url:el("supabaseUrl").value.trim(),key:el("supabaseKey").value.trim()});alert("Configurazione salvata");refresh()});
  const ru=rules();el("ruleTacos").value=ru.tacos;el("ruleAcos").value=ru.acos;el("ruleMargin").value=ru.margin;el("saveRules").addEventListener("click",saveRules)
}

document.addEventListener("DOMContentLoaded",()=>{bind();render();refresh()});
})();