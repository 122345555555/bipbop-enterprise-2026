(function(){
const $=id=>document.getElementById(id);
const n=v=>{if(v==null||v==="")return 0;let s=String(v).replace(/\u00a0/g," ").replace(/€/g,"").replace(/\s/g,"").trim();if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");const m=s.match(/-?\d+(\.\d+)?/);return m?Number(m[0]):0};
const eur=v=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n(v));

let state={transactions:[],adInvoices:[],adsCampaigns:[],searchTerms:[],business:[],inventory:[],costs:[],errors:[]};

function parseCSV(text){
  const rows=[];let row=[],cur="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i],next=text[i+1];
    if(c=='"'&&q&&next=='"'){cur+='"';i++;continue}
    if(c=='"'){q=!q;continue}
    if(c==","&&!q){row.push(cur);cur="";continue}
    if((c=="\\n"||c=="\\r")&&!q){if(c=="\\r"&&next=="\\n")i++;row.push(cur);cur="";if(row.some(x=>String(x).trim()!=""))rows.push(row);row=[];continue}
    cur+=c;
  }
  row.push(cur); if(row.some(x=>String(x).trim()!=""))rows.push(row);
  let hi=0,max=0;rows.forEach((r,i)=>{if(r.length>max){max=r.length;hi=i}});
  const headers=rows[hi].map(h=>String(h).trim());
  return rows.slice(hi+1).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]??"");return o}).filter(o=>Object.values(o).some(v=>String(v).trim()!=""));
}
function readFile(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||""));r.onerror=()=>rej(r.error);r.readAsText(file,"UTF-8")})}
function val(row,names){for(const name of names){if(row[name]!=null&&row[name]!="")return row[name]}return ""}

function normalize(type, rows){
  if(type==="transactions"){
    const by={};
    rows.forEach(r=>{
      const asin=val(r,["ASIN","asin","SKU","Sku"]);
      if(!asin)return;
      if(!by[asin])by[asin]={asin,title:asin,units:0,sales:0,net_sales:0,amazon_fees:0,price:0};
      const p=by[asin];
      p.title=val(r,["Titolo","Title","Product Name","Nome prodotto"])||p.title;
      p.price=n(val(r,["Prezzo medio di vendita","Average Selling Price","price"]))||p.price;
      p.units+=n(val(r,["Unità vendute","Units Sold","Quantity","quantity"]));
      p.sales+=n(val(r,["Vendite","Sales","sales"]))||n(val(r,["Vendite nette","Net Sales","net_sales"]));
      p.net_sales+=n(val(r,["Vendite nette","Net Sales","net_sales"]))||n(val(r,["Vendite","Sales","sales"]));
      p.amazon_fees+=Math.abs(n(val(r,["Totale: Commissione per segnalazione","Referral Fee","Commissione"])));
    });
    return Object.values(by);
  }
  if(type==="ad_invoices"){
    return rows.map(r=>({invoice_id:val(r,["Fattura","Invoice","Invoice ID"])||crypto.randomUUID(),invoice_date:val(r,["Data di emissione della fattura","Invoice Date"]),paid_amount:n(val(r,["Importo pagato (convertito)","Amount Paid","Paid Amount"])),invoiced_amount:n(val(r,["Importo fatturato (convertito)","Invoiced Amount"])),status:val(r,["Stato","Status"])})).filter(x=>x.paid_amount||x.invoiced_amount);
  }
  if(["sponsored_products","sponsored_brands","sponsored_display"].includes(type)){
    return rows.map(r=>({channel:type,campaign:val(r,["Campaign Name","Nome campagna","Campagna"])||"Campagna",target:val(r,["Targeting","Target","Keyword","Parola chiave"]),spend:n(val(r,["Spend","Spesa","Cost","Costo"])),sales:n(val(r,["Sales","Vendite","7 Day Total Sales"])),orders:n(val(r,["Orders","Ordini"])),clicks:n(val(r,["Clicks","Clic"])),impressions:n(val(r,["Impressions","Impressioni"]))})).filter(x=>x.spend||x.sales||x.campaign);
  }
  if(type==="search_terms"){
    return rows.map(r=>({search_term:val(r,["Customer Search Term","Search Term","Termine di ricerca"]),campaign:val(r,["Campaign Name","Campagna"]),spend:n(val(r,["Spend","Spesa","Cost"])),sales:n(val(r,["Sales","Vendite"])),orders:n(val(r,["Orders","Ordini"]))})).filter(x=>x.search_term);
  }
  if(type==="business_report"){
    return rows.map(r=>({asin:val(r,["ASIN","asin"]),title:val(r,["Title","Titolo"]),sessions:n(val(r,["Sessions","Sessioni"])),page_views:n(val(r,["Page Views","Visualizzazioni pagina"])),units:n(val(r,["Units Ordered","Unità ordinate"])),sales:n(val(r,["Ordered Product Sales","Vendite prodotto ordinate"]))})).filter(x=>x.asin||x.title);
  }
  if(type==="inventory"){
    return rows.map(r=>({asin:val(r,["ASIN","asin"]),sku:val(r,["SKU","sku"]),quantity:n(val(r,["Quantity","Quantità","Available"])),title:val(r,["Title","Nome prodotto"])})).filter(x=>x.asin||x.sku);
  }
  if(type==="costs"){
    return rows.map(r=>({asin:val(r,["ASIN","asin"]),category:val(r,["Categoria","Category"])||"Altro",production_cost:n(val(r,["Costo produzione","production_cost"])),shipping_cost:n(val(r,["Costo spedizione","shipping_cost"])),packaging_cost:n(val(r,["Packaging","packaging_cost"]))})).filter(x=>x.asin||x.category);
  }
  return rows;
}
const fileMap={transactions:"file_transactions",ad_invoices:"file_ad_invoices",sponsored_products:"file_sp",sponsored_brands:"file_sb",sponsored_display:"file_sd",search_terms:"file_search_terms",business_report:"file_business",inventory:"file_inventory",costs:"file_costs"};
const tableMap={transactions:"bb13_transactions",ad_invoices:"bb13_ad_invoices",sponsored_products:"bb13_ads_campaigns",sponsored_brands:"bb13_ads_campaigns",sponsored_display:"bb13_ads_campaigns",search_terms:"bb13_search_terms",business_report:"bb13_business_report",inventory:"bb13_inventory",costs:"bb13_costs"};

async function importType(type){
  try{
    const file=$(fileMap[type])?.files?.[0]; if(!file)throw new Error("Seleziona un CSV.");
    const rows=normalize(type,parseCSV(await readFile(file)));
    await window.BipBopSupabase.replaceTable(tableMap[type],rows);
    $("importLog").innerHTML=`✅ ${type}: ${rows.length} righe importate in ${tableMap[type]}.`;
    await loadAll();
  }catch(e){err(e);alert(e.message||e)}
}
async function loadAll(){
  try{
    const d=await window.BipBopSupabase.loadAll();
    state.transactions=d.bb13_transactions||[];
    state.adInvoices=d.bb13_ad_invoices||[];
    state.adsCampaigns=d.bb13_ads_campaigns||[];
    state.searchTerms=d.bb13_search_terms||[];
    state.business=d.bb13_business_report||[];
    state.inventory=d.bb13_inventory||[];
    state.costs=d.bb13_costs||[];
    render();
  }catch(e){err(e);alert(e.message||e)}
}
async function clearAll(){
  if(!confirm("Svuotare tutte le tabelle bb13?"))return;
  try{await window.BipBopSupabase.clearAll();$("importLog").innerHTML="Tabelle bb13 svuotate.";await loadAll()}catch(e){err(e);alert(e.message||e)}
}
function costFor(asin){const c=state.costs.find(x=>x.asin===asin)||{};return{prod:n(c.production_cost)||3.2,ship:n(c.shipping_cost)||5.6}}
function calc(){
  const sales=state.transactions.reduce((a,x)=>a+n(x.net_sales||x.sales),0);
  const fees=state.transactions.reduce((a,x)=>a+n(x.amazon_fees),0)||sales*.08;
  const adsInv=state.adInvoices.reduce((a,x)=>a+n(x.paid_amount),0);
  const adsCamp=state.adsCampaigns.reduce((a,x)=>a+n(x.spend),0);
  let production=0,shipping=0;
  const rows=state.transactions.map(x=>{
    const c=costFor(x.asin), units=n(x.units)||(n(x.price)?Math.round(n(x.sales)/n(x.price)):0);
    const prod=c.prod*units, ship=c.ship*units, gross=n(x.net_sales||x.sales), fee=n(x.amazon_fees)||(gross*.08);
    production+=prod; shipping+=ship;
    return{...x,units,production:prod,shipping:ship,profit:gross-fee-prod-ship};
  });
  const ads=adsInv||adsCamp;
  return{sales,fees,production,shipping,ads,profit:sales-fees-production-shipping-ads,tacos:sales?ads/sales*100:0,rows};
}
function render(){
  const s=calc();
  $("headline").innerHTML=state.transactions.length?`Profitto reale stimato: <span class="${s.profit>=0?"positive":"negative"}">${eur(s.profit)}</span>`:"Nessun report importato";
  $("kpis").innerHTML=[["Transazioni",state.transactions.length],["Vendite",eur(s.sales)],["Amazon fees",eur(s.fees)],["Produzione",eur(s.production)],["Spedizione",eur(s.shipping)],["Ads",eur(s.ads)],["Profitto",eur(s.profit)],["TACOS",s.tacos.toFixed(1)+"%"]].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
  draw("economyChart","bar",["Vendite","Amazon","Produzione","Spedizione","Ads","Profitto"],[s.sales,-s.fees,-s.production,-s.shipping,-s.ads,s.profit],"Euro");
  const top=[...s.rows].sort((a,b)=>b.profit-a.profit).slice(0,10);
  draw("asinChart","bar",top.map(x=>x.asin),top.map(x=>x.profit),"Profitto");
  $("diagnosticBox").innerHTML=`<div class="action"><b>SOLO TABELLE bb13</b><br>Transazioni: ${state.transactions.length}<br>Fatture Ads: ${state.adInvoices.length}<br>Campagne Ads: ${state.adsCampaigns.length}<br>Search Terms: ${state.searchTerms.length}<br>Business Report: ${state.business.length}<br>Inventario: ${state.inventory.length}<br>Costi: ${state.costs.length}</div>`;
  $("profitTable").innerHTML=`<table><tr><th>ASIN</th><th>Vendite</th><th>Fees</th><th>Produzione</th><th>Spedizione</th><th>Profitto pre-Ads</th></tr>${s.rows.map(p=>`<tr><td>${p.asin}</td><td>${eur(p.sales||p.net_sales)}</td><td>${eur(p.amazon_fees)}</td><td>${eur(p.production)}</td><td>${eur(p.shipping)}</td><td>${eur(p.profit)}</td></tr>`).join("")}</table>`;
  $("adsTable").innerHTML=`<div class="action">Fatture Ads: ${eur(state.adInvoices.reduce((a,x)=>a+n(x.paid_amount),0))}<br>Campagne Ads: ${eur(state.adsCampaigns.reduce((a,x)=>a+n(x.spend),0))}</div>`;
  $("asinTable").innerHTML=`<table><tr><th>ASIN</th><th>Titolo</th><th>Unità</th><th>Vendite</th></tr>${state.transactions.map(x=>`<tr><td>${x.asin}</td><td>${x.title||""}</td><td>${x.units||0}</td><td>${eur(x.sales||x.net_sales)}</td></tr>`).join("")}</table>`;
  const cfg=window.BipBopSupabase.getConfig();$("cloudBadge").textContent=cfg.url&&cfg.key?"Cloud configurato":"Cloud non collegato";$("cloudBadge").className="badge "+(cfg.url&&cfg.key?"ok":"bad");
  $("errorBox").textContent=state.errors.length?state.errors.join("\\n"):"Nessun errore.";
}
function draw(id,type,labels,data,label){const c=$(id);if(!c||!window.Chart)return;if(c._chart)c._chart.destroy();c._chart=new Chart(c,{type,data:{labels,datasets:[{label,data}]},options:{responsive:true,maintainAspectRatio:false}})}
function err(e){state.errors.push(String(e?.message||e));render();console.error(e)}
function init(){
  document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.view).classList.add("active");$("pageTitle").textContent=b.textContent.replace(/[📊📥🧪💰📈📦⚙️]/g,"").trim()});
  document.querySelectorAll("[data-import]").forEach(b=>b.onclick=()=>importType(b.dataset.import));
  $("refreshBtn").onclick=loadAll;$("clearBtn").onclick=clearAll;
  const cfg=window.BipBopSupabase.getConfig();$("supabaseUrl").value=cfg.url||"";$("supabaseKey").value=cfg.key||"";
  $("saveSetup").onclick=()=>{window.BipBopSupabase.saveConfig({url:$("supabaseUrl").value.trim(),key:$("supabaseKey").value.trim()});render();alert("Configurazione salvata")};
  render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
