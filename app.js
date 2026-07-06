(function(){
const $=id=>document.getElementById(id);
const REPORTS=[
["business_report","Business Report","Vendite, sessioni, conversioni","obbligatorio",["ordered product sales","sessions","unit session percentage","asin","sku","buy box"]],
["orders","Report ordini","Ordini e quantità vendute","consigliato",["order-id","purchase-date","sku","quantity-purchased","item-price"]],
["transactions","Transazioni / pagamenti","Commissioni, rimborsi, accrediti","obbligatorio",["stato della transazione","tipo di transazione","numero di ordine","commissioni amazon","totale (eur)"]],
["ad_invoices","Fatture Ads","Spesa pubblicitaria reale fatturata","obbligatorio",["invoice","fattura","paid amount","importo pagato","advertising","payment"]],
["sponsored_products","Sponsored Products","Campagne SP","consigliato",["campaign name","spend","sales","acos","impressions","clicks","cpc"]],
["sponsored_brands","Sponsored Brands","Campagne SB","consigliato",["campaign name","spend","sales","brand","impressions","clicks"]],
["sponsored_display","Sponsored Display","Campagne SD","opzionale",["campaign name","spend","sales","display","impressions","clicks"]],
["search_terms","Search Terms","Termini di ricerca","consigliato",["customer search term","search term","keyword","clicks","spend","7 day total sales"]],
["inventory","Inventario","Stock e SKU","consigliato",["sku","available","afn","mfn","inventory","fulfillable"]],
["product_costs","Costi BipBop","Produzione, packaging, spedizione","obbligatorio",["asin","sku","costo","cost","produzione","spedizione","packaging"]]
];
let state={reports:[],counts:{},samples:{},latest:{},errors:[]};
const eur=v=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v||0));
const pct=v=>Number.isFinite(v)?v.toFixed(1)+"%":"non disponibile";
function rules(){return JSON.parse(localStorage.getItem(window.BIPBOP_CONFIG.rulesKey)||'{"targetTacos":15,"targetMargin":25}')}
function num(v){if(v==null||v==="")return 0;let s=String(v).replace(/\u00a0/g," ").replace(/€/g,"").replace(/\s/g,"").trim();if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");const m=s.match(/-?\d+(\.\d+)?/);return m?Number(m[0]):0}
function pick(row,names){const keys=Object.keys(row||{});for(const name of names){const f=keys.find(k=>k.toLowerCase().trim()===name.toLowerCase().trim());if(f&&row[f]!==""&&row[f]!=null)return row[f]}return""}
function findKey(row,frags){const keys=Object.keys(row||{});return keys.find(k=>frags.some(f=>k.toLowerCase().includes(f)))}
function label(type){return (REPORTS.find(r=>r[0]===type)||[type,type])[1]}
function fmtDate(d){try{return new Date(d).toLocaleString("it-IT")}catch(e){return""}}
function normalize(s){return String(s||"").toLowerCase().trim()}
async function sha256(text){const data=new TextEncoder().encode(text);const hash=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function parseCSV(text){const rows=[];let row=[],cur="",q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c=='"'&&q&&n=='"'){cur+='"';i++;continue}if(c=='"'){q=!q;continue}if(c==','&&!q){row.push(cur);cur='';continue}if((c=='\n'||c=='\r')&&!q){if(c=='\r'&&n=='\n')i++;row.push(cur);cur='';if(row.some(x=>String(x).trim()!=''))rows.push(row);row=[];continue}cur+=c}row.push(cur);if(row.some(x=>String(x).trim()!=''))rows.push(row);let hi=0,max=0;rows.forEach((r,i)=>{if(r.length>max){max=r.length;hi=i}});const headers=rows[hi].map((h,i)=>String(h||'').trim()||'col_'+(i+1));const data=rows.slice(hi+1).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]??'');return o}).filter(o=>Object.values(o).some(v=>String(v).trim()!=''));return{headers,data}}}

function readFile(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||""));r.onerror=()=>rej(r.error);r.readAsText(file,"UTF-8")})}
function detectReport(headers,fileName){
 const h=headers.map(normalize).join(" | ");let best=null,score=-1;
 for(const r of REPORTS){let s=0;for(const k of r[4]) if(h.includes(normalize(k))) s++; if(normalize(fileName).includes(r[0].replace("_"," "))) s+=1; if(s>score){score=s;best=r}}
 return score>0?best[0]:"unknown";
}
function extractPeriod(fileName){
 const m=String(fileName).match(/(\d{2})[_-](\d{2})[_-](\d{4}).*?(\d{2})[_-](\d{2})[_-](\d{4})/);
 if(!m)return{};
 return {start:`${m[3]}-${m[2]}-${m[1]}`,end:`${m[6]}-${m[5]}-${m[4]}`};
}
function latestByType(){state.latest={};for(const r of state.reports){if(!state.latest[r.report_type])state.latest[r.report_type]=r}}
async function importFiles(files){
 let out=[];$("importLog").innerHTML="";
 for(const file of files){
  try{
   $("importLog").innerHTML+=`<div>⏳ Leggo ${file.name}...</div>`;
   const text=await readFile(file);
   const fp=await sha256(file.name+"|"+file.size+"|"+text.slice(0,3000));
   const parsed=parseCSV(text);
   const type=detectReport(parsed.headers,file.name);
   if(type==="unknown"){out.push(`⚠️ ${file.name}: tipo report non riconosciuto.`);continue}
   const period=extractPeriod(file.name);
   const r=await window.BipBopSupabase.replaceReport(type,file.name,parsed.headers,parsed.data,fp,period);
   out.push(`✅ ${file.name}: ${label(type)}, ${parsed.data.length} righe, ${parsed.headers.length} colonne${r.wasDuplicate?" — duplicato rilevato":""}.`);
  }catch(e){out.push(`❌ ${file.name}: ${e.message||e}`)}
 }
 $("importLog").innerHTML=out.map(x=>`<div>${x}</div>`).join("");
 await refresh();
}
function renderStatusGrid(){
 $("importStatusGrid").innerHTML=REPORTS.map(([type,name,desc,need])=>{
  const l=state.latest[type],c=state.counts[type]||0,ok=c>0;
  return `<div class="import-box ${ok?"ok":"missing"}"><h4>${name}</h4><p class="hint">${desc}</p><p><span class="pill">${need}</span></p><div class="meta"><div><b>Stato:</b> ${ok?"🟢 Importato":"🔴 Mancante"}</div><div><b>File:</b> ${l?.file_name||"—"}</div><div><b>Righe attive:</b> ${c}</div><div><b>Colonne:</b> ${Array.isArray(l?.headers)?l.headers.length:"—"}</div><div><b>Periodo:</b> ${l?.period_start||"—"} ${l?.period_end?"→ "+l.period_end:""}</div><div><b>Ultimo import:</b> ${l?fmtDate(l.imported_at):"—"}</div><div><b>Duplicato:</b> ${l?.is_duplicate?"sì":"no"}</div></div></div>`
 }).join("");
}
async function refresh(){
 try{
  const cfg=window.BipBopSupabase.getConfig();
  $("cloudBadge").textContent=cfg.url&&cfg.key?"Cloud configurato":"Cloud non collegato";
  $("cloudBadge").className="badge "+(cfg.url&&cfg.key?"ok":"bad");
  if(!cfg.url||!cfg.key){render();return}
  state.reports=await window.BipBopSupabase.listReports();
  state.counts={};state.samples={};
  for(const [type] of REPORTS){state.counts[type]=await window.BipBopSupabase.countReport(type);if(state.counts[type]>0)state.samples[type]=await window.BipBopSupabase.sampleReport(type,5000)}
  latestByType();render();
 }catch(e){err(e)}
}
function calc(){
 const br=state.samples.business_report||[],tx=state.samples.transactions||[],adsInv=state.samples.ad_invoices||[],costs=state.samples.product_costs||[],sp=state.samples.sponsored_products||[],sb=state.samples.sponsored_brands||[],sd=state.samples.sponsored_display||[],st=state.samples.search_terms||[];
 const brSales=br.reduce((a,r)=>a+num(pick(r,["Ordered Product Sales","Vendite prodotto ordinate","Sales","Vendite"])),0);
 const txTotal=tx.reduce((a,r)=>a+num(pick(r,["Totale (EUR)","Total (EUR)","Total","Totale"])),0);
 const sales=brSales||Math.max(txTotal,0);
 const amazonFees=tx.reduce((a,r)=>a+num(pick(r,["Commissioni Amazon","Amazon fees","commissioni"])),0);
 const adsInvoice=adsInv.reduce((a,r)=>a+num(pick(r,["Importo pagato (convertito)","Paid Amount","Amount Paid","Totale","Total","Importo"])),0);
 const adsReports=[...sp,...sb,...sd];
 const adsSpendReport=adsReports.reduce((a,r)=>a+num(pick(r,["Spend","Spesa","Cost","Costo"])),0);
 const ads=adsInvoice||adsSpendReport;
 const adsSales=adsReports.reduce((a,r)=>a+num(pick(r,["Sales","7 Day Total Sales","14 Day Total Sales","Vendite"])),0);
 const clicks=adsReports.reduce((a,r)=>a+num(pick(r,["Clicks","Clic"])),0);
 const impressions=adsReports.reduce((a,r)=>a+num(pick(r,["Impressions","Impressioni"])),0);
 const orders=adsReports.reduce((a,r)=>a+num(pick(r,["Orders","Ordini","7 Day Total Orders"])),0);
 const costsTot=costs.reduce((a,r)=>a+num(pick(r,["Costo totale","Total cost","Costo","Cost","production_cost","Costo produzione"])),0);
 const profit=sales+amazonFees-ads-costsTot;
 const tacos=sales?ads/sales*100:NaN;
 const roas=ads?adsSales/ads:NaN;
 const acos=adsSales?ads/adsSales*100:NaN;
 const ctr=impressions?clicks/impressions*100:NaN;
 const cpc=clicks?ads/clicks:NaN;
 return{sales,amazonFees,ads,adsInvoice,adsSpendReport,adsSales,clicks,impressions,orders,costsTot,profit,tacos,roas,acos,ctr,cpc,searchTerms:st.length};
}
function asinRows(){
 const br=state.samples.business_report||[],tx=state.samples.transactions||[];
 const map=new Map();
 for(const r of br){
  const asin=pick(r,["ASIN","Parent ASIN","Child ASIN"])||"N/D";
  const title=pick(r,["Title","Titolo","Product Name","Nome prodotto"])||"";
  const sales=num(pick(r,["Ordered Product Sales","Sales","Vendite prodotto ordinate","Vendite"]));
  const units=num(pick(r,["Units Ordered","Unità ordinate","Units","Quantità"]));
  const sessions=num(pick(r,["Sessions","Sessioni"]));
  const cr=num(pick(r,["Unit Session Percentage","Conversion Rate","Tasso conversione"]));
  const obj=map.get(asin)||{asin,title,sales:0,units:0,sessions:0,cr:0};
  obj.sales+=sales;obj.units+=units;obj.sessions+=sessions;obj.cr=Math.max(obj.cr,cr);map.set(asin,obj);
 }
 for(const r of tx){
  const details=pick(r,["Dettagli prodotto","Product Details","Title"])||"";
  const asin=(String(details).match(/B0[A-Z0-9]{8}/)||["N/D"])[0];
  const obj=map.get(asin)||{asin,title:details,sales:0,units:0,sessions:0,cr:0};
  obj.sales+=Math.max(num(pick(r,["Totale (EUR)","Total (EUR)","Totale"])),0);map.set(asin,obj);
 }
 return [...map.values()].sort((a,b)=>b.sales-a.sales).slice(0,50);
}
function recommendations(){
 const c=calc(),r=rules(),list=[];
 if(!state.counts.business_report)list.push(["red","Importa Business Report","Senza Business Report non possiamo leggere conversione, sessioni e vendite per ASIN."]);
 if(!state.counts.transactions)list.push(["red","Importa Transazioni","Serve per commissioni Amazon, rimborsi e totale economico reale."]);
 if(!state.counts.ad_invoices)list.push(["yellow","Importa Fatture Ads","È il dato più affidabile per la spesa pubblicitaria reale, più sicuro dei report campagna."]);
 if(!state.counts.product_costs)list.push(["yellow","Importa Costi BipBop","Senza costi produzione/spedizione il profitto netto è solo provvisorio."]);
 if(Number.isFinite(c.tacos) && c.tacos>r.targetTacos)list.push(["red","TACOS troppo alto",`TACOS ${pct(c.tacos)} sopra il target ${r.targetTacos}%. Riduci CPC/campagne non profittevoli o aumenta conversione.`]);
 if(Number.isFinite(c.roas) && c.roas<2)list.push(["red","ROAS basso",`ROAS ${c.roas.toFixed(2)}. Verifica keyword con click e zero ordini.`]);
 if(Number.isFinite(c.ctr) && c.ctr<0.25)list.push(["yellow","CTR basso",`CTR Ads ${pct(c.ctr)}. Migliora immagine principale, prezzo o pertinenza keyword.`]);
 if(c.profit<0 && c.sales>0)list.push(["red","Profitto negativo",`Profitto stimato ${eur(c.profit)}. Controlla prezzi, Ads e costi per ASIN.`]);
 if(c.sales>0 && list.length<4)list.push(["green","Base dati utilizzabile","Puoi iniziare ad analizzare ASIN, Ads e margini con i report caricati."]);
 return list;
}
function render(){
 const imported=REPORTS.filter(([t])=>(state.counts[t]||0)>0).length,totalRows=Object.values(state.counts).reduce((a,b)=>a+(b||0),0),c=calc(),recs=recommendations();
 $("headline").textContent=imported?`${imported} report importati`:"Amazon Growth Engine pronto";
 $("subtitle").textContent=imported?"Analisi pronta sui dati caricati.":"Trascina i CSV Amazon in Import automatico.";
 $("kpis").innerHTML=[["Report",imported+" / "+REPORTS.length],["Righe",totalRows],["Vendite",c.sales?eur(c.sales):"non disponibili"],["Profitto",c.sales?eur(c.profit):"non calcolabile"],["Ads",c.ads?eur(c.ads):"non disponibili"],["TACOS",pct(c.tacos)],["ROAS",Number.isFinite(c.roas)?c.roas.toFixed(2):"non disponibile"],["CTR",pct(c.ctr)]].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
 $("requiredBox").innerHTML=REPORTS.map(([t,n,d,need])=>{const ok=(state.counts[t]||0)>0;return `<div class="action"><b>${n}</b><br>${ok?`<span class="status-ok">✓ importato</span> — ${state.counts[t]} righe`:`<span class="${need==="obbligatorio"?"status-missing":"status-warn"}">${need==="obbligatorio"?"mancante obbligatorio":"mancante"}</span>`}</div>`}).join("");
 $("actionBox").innerHTML=recs.slice(0,6).map(x=>`<div class="action ${x[0]}"><b>${x[1]}</b><br>${x[2]}</div>`).join("");
 $("growthBox").innerHTML=`<div class="grid3">${recs.map(x=>`<div class="action ${x[0]}"><b>${x[1]}</b><br>${x[2]}</div>`).join("")}</div>`;
 $("reportsTable").innerHTML=state.reports.length?`<table><tr><th>Report</th><th>File</th><th>Periodo</th><th>Righe</th><th>Colonne</th><th>Duplicato</th><th>Importato</th></tr>${state.reports.map(r=>`<tr><td><span class="pill">${label(r.report_type)}</span></td><td>${r.file_name||""}</td><td>${r.period_start||"—"} ${r.period_end?"→ "+r.period_end:""}</td><td>${r.row_count||0}</td><td>${Array.isArray(r.headers)?r.headers.length:""}</td><td>${r.is_duplicate?"sì":"no"}</td><td>${fmtDate(r.imported_at)}</td></tr>`).join("")}</table>`:`<div class="action">Nessun report importato.</div>`;
 const ar=asinRows();$("asinBox").innerHTML=ar.length?`<table><tr><th>ASIN</th><th>Titolo</th><th>Vendite</th><th>Unità</th><th>Sessioni</th><th>Conv.</th></tr>${ar.map(r=>`<tr><td>${r.asin}</td><td>${r.title||""}</td><td>${eur(r.sales)}</td><td>${r.units||""}</td><td>${r.sessions||""}</td><td>${r.cr?String(r.cr).replace(".",",")+"%":"—"}</td></tr>`).join("")}</table>`:`<div class="action">Importa Business Report o Transazioni per vedere gli ASIN.</div>`;
 $("adsBox").innerHTML=`<div class="grid3"><div class="kpi"><small>Spesa Ads</small><strong>${c.ads?eur(c.ads):"—"}</strong></div><div class="kpi"><small>Vendite attribuite Ads</small><strong>${c.adsSales?eur(c.adsSales):"—"}</strong></div><div class="kpi"><small>ACOS</small><strong>${pct(c.acos)}</strong></div><div class="kpi"><small>ROAS</small><strong>${Number.isFinite(c.roas)?c.roas.toFixed(2):"—"}</strong></div><div class="kpi"><small>CPC</small><strong>${Number.isFinite(c.cpc)?eur(c.cpc):"—"}</strong></div><div class="kpi"><small>CTR</small><strong>${pct(c.ctr)}</strong></div></div>`;
 $("profitBox").innerHTML=`<div class="grid3"><div class="kpi"><small>Vendite</small><strong>${c.sales?eur(c.sales):"—"}</strong></div><div class="kpi"><small>Commissioni Amazon</small><strong>${c.amazonFees?eur(c.amazonFees):"—"}</strong></div><div class="kpi"><small>Ads</small><strong>${c.ads?eur(c.ads):"—"}</strong></div><div class="kpi"><small>Costi BipBop</small><strong>${c.costsTot?eur(c.costsTot):"—"}</strong></div><div class="kpi"><small>Profitto stimato</small><strong>${c.sales?eur(c.profit):"—"}</strong></div><div class="kpi"><small>Margine</small><strong>${c.sales?pct(c.profit/c.sales*100):"—"}</strong></div></div><p class="hint">Il profitto diventa affidabile solo con Business Report, Transazioni, Fatture Ads e Costi BipBop.</p>`;
 $("alertsBox").innerHTML=recs.map(x=>`<div class="action ${x[0]}">🚨 <b>${x[1]}</b><br>${x[2]}</div>`).join("");
 $("diagnosticBox").innerHTML=`<div class="action"><b>SOLO TABELLE BB30 GROWTH ENGINE</b><br>Import log: ${state.reports.length}<br>Raw rows: ${totalRows}<br>Report configurati: ${REPORTS.length}<br>Storage: ${window.BIPBOP_CONFIG.storageKey}</div>`;
 $("errorBox").textContent=state.errors.length?state.errors.join("\n"):"Nessun errore.";renderStatusGrid();
}
function err(e){state.errors.push(String(e?.message||e));render();console.error(e)}
function init(){
 document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.view).classList.add("active");$("pageTitle").textContent=b.textContent.replace(/[📊📥📁🚀📦📈💰🚨🧪⚙️]/g,"").trim()});
 $("refreshBtn").onclick=refresh;$("selectFilesBtn").onclick=()=>$("multiFile").click();$("multiFile").onchange=e=>importFiles([...e.target.files]);$("clearImportLogBtn").onclick=()=>$("importLog").innerHTML="Pronto.";
 const dz=$("dropZone");dz.onclick=()=>$("multiFile").click();["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("drag")}));["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("drag")}));dz.addEventListener("drop",e=>importFiles([...e.dataTransfer.files].filter(f=>f.name.toLowerCase().match(/\.(csv|txt)$/))));
 const cfg=window.BipBopSupabase.getConfig();$("supabaseUrl").value=cfg.url||"";$("supabaseKey").value=cfg.key||"";
 const ru=rules();$("targetTacos").value=ru.targetTacos;$("targetMargin").value=ru.targetMargin;
 $("saveSetup").onclick=()=>{window.BipBopSupabase.saveConfig({url:$("supabaseUrl").value.trim(),key:$("supabaseKey").value.trim()});alert("Configurazione salvata");refresh()};
 $("saveRules").onclick=()=>{localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({targetTacos:num($("targetTacos").value),targetMargin:num($("targetMargin").value)}));alert("Regole salvate");render()};
 refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();