(function(){
const $=id=>document.getElementById(id);
const REPORTS=[
  ["business_report","Business Report","Vendite, sessioni, conversioni","obbligatorio"],
  ["orders","Report ordini","Ordini e quantità vendute","consigliato"],
  ["transactions","Transazioni / pagamenti","Commissioni, rimborsi, accrediti","obbligatorio"],
  ["ad_invoices","Fatture Ads","Spesa pubblicitaria reale fatturata","obbligatorio"],
  ["sponsored_products","Sponsored Products","Campagne SP","consigliato"],
  ["sponsored_brands","Sponsored Brands","Campagne SB","consigliato"],
  ["sponsored_display","Sponsored Display","Campagne SD","opzionale"],
  ["search_terms","Search Terms","Termini di ricerca","consigliato"],
  ["inventory","Inventario","Stock e SKU","consigliato"],
  ["product_costs","Costi BipBop","Produzione, packaging, spedizione","obbligatorio"]
];

let state={reports:[],counts:{},samples:{},errors:[]};

const eur=v=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v||0));
function num(v){
  if(v==null||v==="") return 0;
  let s=String(v).replace(/\u00a0/g," ").replace(/€/g,"").replace(/\s/g,"").trim();
  if(s.includes(",")&&s.includes(".")) s=s.replace(/\./g,"").replace(",",".");
  else if(s.includes(",")) s=s.replace(",",".");
  const m=s.match(/-?\d+(\.\d+)?/);
  return m?Number(m[0]):0;
}
function pick(row,names){
  const keys=Object.keys(row||{});
  for(const name of names){
    const found=keys.find(k=>k.toLowerCase().trim()===name.toLowerCase().trim());
    if(found && row[found]!=="" && row[found]!=null) return row[found];
  }
  return "";
}
function label(type){return (REPORTS.find(r=>r[0]===type)||[type,type])[1]}

function parseCSV(text){
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],next=text[i+1];
    if(c=='"'&&q&&next=='"'){cur+='"';i++;continue}
    if(c=='"'){q=!q;continue}
    if(c==","&&!q){row.push(cur);cur="";continue}
    if((c=="\n"||c=="\r")&&!q){
      if(c=="\r"&&next=="\n")i++;
      row.push(cur);cur="";
      if(row.some(x=>String(x).trim()!=""))rows.push(row);
      row=[];continue
    }
    cur+=c
  }
  row.push(cur);
  if(row.some(x=>String(x).trim()!=""))rows.push(row);
  let hi=0,max=0;
  rows.forEach((r,i)=>{if(r.length>max){max=r.length;hi=i}});
  const headers=rows[hi].map((h,i)=>String(h||"").trim()||"col_"+(i+1));
  const data=rows.slice(hi+1).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]??"");return o}).filter(o=>Object.values(o).some(v=>String(v).trim()!=""));
  return{headers,data}
}
function readFile(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||""));r.onerror=()=>rej(r.error);r.readAsText(file,"UTF-8")})}

function renderImportGrid(){
  $("importGrid").innerHTML=REPORTS.map(([type,label,desc,need])=>`
    <div class="import-box">
      <h4>${label}</h4>
      <p class="hint">${desc}</p>
      <p><span class="pill">${need}</span></p>
      <input id="file_${type}" type="file" accept=".csv">
      <button data-import="${type}">Importa / sostituisci</button>
      <button class="dangerBtn" data-clear="${type}">Elimina report</button>
    </div>
  `).join("");
  document.querySelectorAll("[data-import]").forEach(b=>b.onclick=()=>importReport(b.dataset.import));
  document.querySelectorAll("[data-clear]").forEach(b=>b.onclick=()=>clearReport(b.dataset.clear));
}

async function importReport(type){
  try{
    const file=$("file_"+type)?.files?.[0];
    if(!file) throw new Error("Seleziona un file CSV.");
    const parsed=parseCSV(await readFile(file));
    await window.BipBopSupabase.replaceReport(type,file.name,parsed.headers,parsed.data);
    $("importLog").innerHTML=`✅ ${label(type)} importato: ${parsed.data.length} righe, ${parsed.headers.length} colonne.`;
    await refresh();
  }catch(e){err(e);alert(e.message||e)}
}
async function clearReport(type){
  if(!confirm("Eliminare il report "+label(type)+"?"))return;
  try{await window.BipBopSupabase.clearReport(type);$("importLog").innerHTML=`Report ${label(type)} eliminato.`;await refresh()}catch(e){err(e);alert(e.message||e)}
}

async function refresh(){
  try{
    const cfg=window.BipBopSupabase.getConfig();
    $("cloudBadge").textContent=cfg.url&&cfg.key?"Cloud configurato":"Cloud non collegato";
    $("cloudBadge").className="badge "+(cfg.url&&cfg.key?"ok":"bad");
    if(!cfg.url||!cfg.key){render();return}
    state.reports=await window.BipBopSupabase.listReports();
    state.counts={}; state.samples={};
    for(const [type] of REPORTS){
      state.counts[type]=await window.BipBopSupabase.countReport(type);
      if(state.counts[type]>0) state.samples[type]=await window.BipBopSupabase.sampleReport(type,1000);
    }
    render();
  }catch(e){err(e)}
}

function calcSummary(){
  const br=state.samples.business_report||[];
  const tx=state.samples.transactions||[];
  const adsInv=state.samples.ad_invoices||[];
  const costs=state.samples.product_costs||[];

  const sales = br.reduce((a,r)=>a+num(pick(r,["Ordered Product Sales","Vendite prodotto ordinate","Sales","Vendite"])),0)
             || tx.reduce((a,r)=>a+num(pick(r,["Vendite","Sales","net_sales","Net Sales"])),0);

  const ads = adsInv.reduce((a,r)=>a+num(pick(r,["Importo pagato (convertito)","Paid Amount","Amount Paid","Totale","Total","Importo"])),0);

  const costTotal = costs.reduce((a,r)=>a+num(pick(r,["Costo totale","Total cost","Costo","Cost","production_cost","Costo produzione"])),0);

  const profitAvailable = !!(sales && (adsInv.length || costs.length));
  const profit = profitAvailable ? sales - ads - costTotal : null;

  return {sales,ads,costTotal,profit,profitAvailable};
}

function render(){
  const imported=REPORTS.filter(([type])=>(state.counts[type]||0)>0).length;
  const totalRows=Object.values(state.counts).reduce((a,b)=>a+(b||0),0);
  const s=calcSummary();

  $("headline").textContent=imported?`${imported} report importati`:"Dashboard pronta";
  $("subtitle").textContent=imported?"I dati sono separati per report e pronti per i calcoli.":"Importa i report Amazon uno alla volta.";

  $("kpis").innerHTML=[
    ["Report importati",imported+" / "+REPORTS.length],
    ["Righe totali",totalRows],
    ["Vendite rilevate",s.sales?eur(s.sales):"non disponibili"],
    ["Ads fatture",s.ads?eur(s.ads):"non disponibili"],
    ["Costi",s.costTotal?eur(s.costTotal):"non disponibili"],
    ["Profitto",s.profitAvailable?eur(s.profit):"non calcolabile"],
    ["Business Report",state.counts.business_report||0],
    ["Fatture Ads",state.counts.ad_invoices||0]
  ].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");

  $("requiredBox").innerHTML=REPORTS.map(([type,label,desc,need])=>{
    const ok=(state.counts[type]||0)>0;
    return `<div class="action"><b>${label}</b> — ${desc}<br>${ok?`<span class="status-ok">✓ importato</span> — ${state.counts[type]} righe`:`<span class="${need==="obbligatorio"?"status-missing":"status-warn"}">${need==="obbligatorio"?"mancante obbligatorio":"mancante"}</span>`}</div>`
  }).join("");

  const actions=[];
  if(!state.counts.business_report) actions.push("Importa il Business Report per leggere vendite e conversioni.");
  if(!state.counts.ad_invoices) actions.push("Importa le fatture Ads: è il dato più affidabile per la spesa pubblicitaria reale.");
  if(!state.counts.product_costs) actions.push("Importa i costi BipBop per calcolare il profitto netto.");
  if(state.counts.business_report && state.counts.ad_invoices && state.counts.product_costs) actions.push("Base minima completa: ora possiamo calcolare profitto, TACOS e margini.");
  $("actionBox").innerHTML=actions.map(a=>`<div class="action">${a}</div>`).join("") || `<div class="action">Nessuna azione urgente.</div>`;

  $("reportsTable").innerHTML=state.reports.length?`
    <table><tr><th>Report</th><th>File</th><th>Righe</th><th>Colonne</th><th>Importato</th></tr>
    ${state.reports.map(r=>`<tr><td><span class="pill">${label(r.report_type)}</span></td><td>${r.file_name||""}</td><td>${r.row_count||0}</td><td>${Array.isArray(r.headers)?r.headers.length:""}</td><td>${new Date(r.imported_at).toLocaleString("it-IT")}</td></tr>`).join("")}
    </table>`:`<div class="action">Nessun report importato.</div>`;

  $("asinBox").innerHTML=state.counts.business_report||state.counts.transactions?`<div class="action">Dati ASIN disponibili. Prossimo step: tabella margine per ASIN.</div>`:`<div class="action">Importa Business Report o Transazioni.</div>`;
  $("adsBox").innerHTML=state.counts.ad_invoices||state.counts.sponsored_products?`<div class="action">Dati Ads disponibili. Spesa fatture rilevata: <b>${s.ads?eur(s.ads):"da verificare"}</b>.</div>`:`<div class="action">Importa Fatture Ads e report campagne.</div>`;
  $("profitBox").innerHTML=s.profitAvailable?`<div class="action">Profitto preliminare: <b>${eur(s.profit)}</b>. Verrà raffinato con transazioni e costi per ASIN.</div>`:`<div class="action">Profitto non calcolabile: servono Business Report, Fatture Ads e Costi.</div>`;
  $("alertsBox").innerHTML=actions.map(a=>`<div class="action">🚨 ${a}</div>`).join("") || `<div class="action">Nessun avviso.</div>`;

  $("diagnosticBox").innerHTML=`<div class="action"><b>SOLO TABELLE DEFINITIVE</b><br>Import log: ${state.reports.length}<br>Raw rows: ${totalRows}<br>Tipi report configurati: ${REPORTS.length}<br>Storage key: ${window.BIPBOP_CONFIG.storageKey}</div>`;
  $("errorBox").textContent=state.errors.length?state.errors.join("\n"):"Nessun errore.";
}

function err(e){state.errors.push(String(e?.message||e));render();console.error(e)}

function init(){
  renderImportGrid();
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    $(b.dataset.view).classList.add("active");
    $("pageTitle").textContent=b.textContent.replace(/[📊📥📁📦📈💰🚨🧪⚙️]/g,"").trim();
  });
  $("refreshBtn").onclick=refresh;
  const cfg=window.BipBopSupabase.getConfig();
  $("supabaseUrl").value=cfg.url||"";
  $("supabaseKey").value=cfg.key||"";
  $("saveSetup").onclick=()=>{window.BipBopSupabase.saveConfig({url:$("supabaseUrl").value.trim(),key:$("supabaseKey").value.trim()});alert("Configurazione salvata");refresh()};
  refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();