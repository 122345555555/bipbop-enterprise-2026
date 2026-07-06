(function () {
"use strict";

const REPORTS = [
  { type:"business_report", name:"Business Report", need:"obbligatorio", keys:["ordered product sales","sessions","unit session percentage","asin","sku"] },
  { type:"transactions", name:"Transazioni / pagamenti", need:"obbligatorio", keys:["stato della transazione","tipo di transazione","numero di ordine","commissioni amazon","totale (eur)"] },
  { type:"ad_invoices", name:"Fatture Ads", need:"obbligatorio", keys:["invoice","fattura","paid amount","importo pagato","advertising"] },
  { type:"sponsored_products", name:"Sponsored Products", need:"consigliato", keys:["campaign name","spend","sales","acos","impressions","clicks"] },
  { type:"sponsored_brands", name:"Sponsored Brands", need:"consigliato", keys:["campaign name","spend","sales","brand","impressions","clicks"] },
  { type:"sponsored_display", name:"Sponsored Display", need:"opzionale", keys:["campaign name","spend","sales","display","impressions","clicks"] },
  { type:"search_terms", name:"Search Terms", need:"consigliato", keys:["customer search term","search term","keyword","clicks","spend"] },
  { type:"orders", name:"Report ordini", need:"consigliato", keys:["order-id","purchase-date","sku","quantity-purchased"] },
  { type:"inventory", name:"Inventario", need:"consigliato", keys:["sku","available","inventory","fulfillable"] },
  { type:"product_costs", name:"Costi BipBop", need:"obbligatorio", keys:["asin","sku","costo","cost","produzione","spedizione"] }
];

const state = { log: [], counts: {}, samples: {}, latest: {}, errors: [] };

function el(id) { return document.getElementById(id); }
function euro(v) { return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v || 0)); }
function n(v) {
  if (v === null || v === undefined || v === "") return 0;
  let s = String(v).replace(/\u00a0/g," ").replace(/€/g,"").replace(/\s/g,"").trim();
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g,"").replace(",",".");
  else if (s.includes(",")) s = s.replace(",",".");
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}
function pct(v) { return Number.isFinite(v) ? v.toFixed(1) + "%" : "—"; }
function low(s) { return String(s || "").toLowerCase().trim(); }
function label(type) { const r = REPORTS.find(x => x.type === type); return r ? r.name : type; }
function pick(row, names) {
  const keys = Object.keys(row || {});
  for (const name of names) {
    const found = keys.find(k => low(k) === low(name));
    if (found && row[found] !== "" && row[found] !== null && row[found] !== undefined) return row[found];
  }
  return "";
}
function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i=0;i<text.length;i++) {
    const c = text[i], nx = text[i+1];
    if (c === '"' && q && nx === '"') { cur += '"'; i++; continue; }
    if (c === '"') { q = !q; continue; }
    if (c === "," && !q) { row.push(cur); cur = ""; continue; }
    if ((c === "\n" || c === "\r") && !q) {
      if (c === "\r" && nx === "\n") i++;
      row.push(cur); cur = "";
      if (row.some(x => String(x).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += c;
  }
  row.push(cur);
  if (row.some(x => String(x).trim() !== "")) rows.push(row);
  if (!rows.length) return { headers: [], data: [] };
  let headerIndex = 0, maxCols = 0;
  rows.forEach((r,i) => { if (r.length > maxCols) { maxCols = r.length; headerIndex = i; } });
  const headers = rows[headerIndex].map((h,i) => String(h || "").trim() || ("col_" + (i+1)));
  const data = rows.slice(headerIndex + 1).map(r => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = r[i] || "");
    return obj;
  }).filter(o => Object.values(o).some(v => String(v).trim() !== ""));
  return { headers, data };
}
function readFile(file) {
  return new Promise((resolve,reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file, "UTF-8");
  });
}
async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
}
function detect(headers, fileName) {
  const h = headers.map(low).join(" | ");
  let best = { type:"unknown", score:0 };
  REPORTS.forEach(r => {
    let score = 0;
    r.keys.forEach(k => { if (h.includes(low(k))) score++; });
    if (low(fileName).includes(r.type.replace("_"," "))) score++;
    if (score > best.score) best = { type:r.type, score };
  });
  return best.score ? best.type : "unknown";
}

async function importFiles(files) {
  const logLines = [];
  for (const file of files) {
    try {
      const text = await readFile(file);
      const parsed = parseCSV(text);
      const type = detect(parsed.headers, file.name);
      if (type === "unknown") {
        logLines.push("⚠️ " + file.name + ": tipo report non riconosciuto.");
        continue;
      }
      const fingerprint = await hashText(file.name + "|" + file.size + "|" + text.slice(0,3000));
      const result = await window.BipBopDB.insertReport(type, file.name, parsed.headers, parsed.data, fingerprint);
      logLines.push("✅ " + file.name + ": " + label(type) + ", " + parsed.data.length + " righe, " + parsed.headers.length + " colonne" + (result.isDuplicate ? " — duplicato rilevato" : "") + ".");
    } catch (err) {
      logLines.push("❌ " + file.name + ": " + (err.message || err));
      state.errors.push(String(err.message || err));
    }
  }
  el("importLog").innerHTML = logLines.map(x => "<div>" + x + "</div>").join("");
  await refresh();
}

function calc() {
  const br = state.samples.business_report || [];
  const tx = state.samples.transactions || [];
  const adsInv = state.samples.ad_invoices || [];
  const adsRows = [...(state.samples.sponsored_products || []), ...(state.samples.sponsored_brands || []), ...(state.samples.sponsored_display || [])];
  const costs = state.samples.product_costs || [];

  const brSales = br.reduce((a,r) => a + n(pick(r,["Ordered Product Sales","Vendite prodotto ordinate","Sales","Vendite"])), 0);
  const txTotal = tx.reduce((a,r) => a + n(pick(r,["Totale (EUR)","Total (EUR)","Total","Totale"])), 0);
  const sales = brSales || Math.max(txTotal, 0);

  const amazonFees = tx.reduce((a,r) => a + n(pick(r,["Commissioni Amazon","Amazon fees","commissioni"])), 0);
  const adsInvoice = adsInv.reduce((a,r) => a + n(pick(r,["Importo pagato (convertito)","Paid Amount","Amount Paid","Totale","Total","Importo"])), 0);
  const adsSpend = adsRows.reduce((a,r) => a + n(pick(r,["Spend","Spesa","Cost","Costo"])), 0);
  const adsSales = adsRows.reduce((a,r) => a + n(pick(r,["Sales","7 Day Total Sales","14 Day Total Sales","Vendite"])), 0);
  const clicks = adsRows.reduce((a,r) => a + n(pick(r,["Clicks","Clic"])), 0);
  const impressions = adsRows.reduce((a,r) => a + n(pick(r,["Impressions","Impressioni"])), 0);
  const ads = adsInvoice || adsSpend;
  const costsTotal = costs.reduce((a,r) => a + n(pick(r,["Costo totale","Total cost","Costo","Cost","production_cost","Costo produzione"])), 0);

  const profit = sales + amazonFees - ads - costsTotal;
  return {
    sales, amazonFees, ads, adsSales, clicks, impressions, costsTotal, profit,
    tacos: sales ? ads / sales * 100 : NaN,
    acos: adsSales ? ads / adsSales * 100 : NaN,
    roas: ads ? adsSales / ads : NaN,
    ctr: impressions ? clicks / impressions * 100 : NaN,
    cpc: clicks ? ads / clicks : NaN
  };
}
function recommendations(c) {
  const out = [];
  if (!state.counts.business_report) out.push(["red","Importa Business Report","Serve per capire vendite, sessioni, conversione e ASIN."]);
  if (!state.counts.transactions) out.push(["red","Importa Transazioni","Serve per leggere commissioni Amazon e totale economico reale."]);
  if (!state.counts.ad_invoices) out.push(["yellow","Importa Fatture Ads","Serve per la spesa pubblicitaria reale fatturata."]);
  if (!state.counts.product_costs) out.push(["yellow","Importa Costi BipBop","Senza costi produzione/spedizione il profitto resta provvisorio."]);
  if (Number.isFinite(c.tacos) && c.tacos > 15) out.push(["red","TACOS alto","TACOS " + pct(c.tacos) + ": controlla CPC, keyword e conversione."]);
  if (Number.isFinite(c.ctr) && c.ctr < 0.25) out.push(["yellow","CTR basso","CTR " + pct(c.ctr) + ": migliora immagine principale o pertinenza keyword."]);
  if (c.sales > 0 && c.profit < 0) out.push(["red","Profitto negativo","Profitto stimato " + euro(c.profit) + ": rivedi prezzi, Ads e costi."]);
  if (!out.length) out.push(["green","Base pronta","I report principali sono presenti. Si può passare all’analisi dettagliata."]);
  return out;
}
function asinRows() {
  const br = state.samples.business_report || [];
  const tx = state.samples.transactions || [];
  const map = new Map();

  br.forEach(r => {
    const asin = pick(r,["ASIN","Parent ASIN","Child ASIN"]) || "N/D";
    const title = pick(r,["Title","Titolo","Product Name","Nome prodotto"]) || "";
    const obj = map.get(asin) || { asin, title, sales:0, units:0, sessions:0, cr:0 };
    obj.sales += n(pick(r,["Ordered Product Sales","Sales","Vendite prodotto ordinate","Vendite"]));
    obj.units += n(pick(r,["Units Ordered","Unità ordinate","Units","Quantità"]));
    obj.sessions += n(pick(r,["Sessions","Sessioni"]));
    obj.cr = Math.max(obj.cr, n(pick(r,["Unit Session Percentage","Conversion Rate","Tasso conversione"])));
    map.set(asin,obj);
  });
  tx.forEach(r => {
    const details = pick(r,["Dettagli prodotto","Product Details","Title"]) || "";
    const m = String(details).match(/B0[A-Z0-9]{8}/);
    const asin = m ? m[0] : "N/D";
    const obj = map.get(asin) || { asin, title:details, sales:0, units:0, sessions:0, cr:0 };
    obj.sales += Math.max(n(pick(r,["Totale (EUR)","Total (EUR)","Totale"])), 0);
    map.set(asin,obj);
  });
  return Array.from(map.values()).sort((a,b) => b.sales - a.sales).slice(0,50);
}

async function refresh() {
  try {
    const cfg = window.BipBopDB.config();
    el("cloudBadge").textContent = cfg.url && cfg.key ? "Cloud configurato" : "Cloud non collegato";
    el("cloudBadge").className = "badge " + (cfg.url && cfg.key ? "ok" : "bad");

    if (!cfg.url || !cfg.key) {
      render();
      return;
    }

    state.log = await window.BipBopDB.listLog();
    state.counts = {};
    state.samples = {};
    state.latest = {};
    for (const r of REPORTS) {
      state.counts[r.type] = await window.BipBopDB.countType(r.type);
      if (state.counts[r.type] > 0) state.samples[r.type] = await window.BipBopDB.sample(r.type);
    }
    state.log.forEach(r => { if (!state.latest[r.report_type]) state.latest[r.report_type] = r; });
    render();
  } catch (err) {
    state.errors.push(String(err.message || err));
    render();
  }
}

function render() {
  const c = calc();
  const imported = REPORTS.filter(r => (state.counts[r.type] || 0) > 0).length;
  const totalRows = Object.values(state.counts).reduce((a,b) => a + (b || 0), 0);
  const recs = recommendations(c);

  el("dashboardTitle").textContent = imported ? imported + " report importati" : "Centro di comando pronto";
  el("dashboardSub").textContent = imported ? "Dati disponibili per le prime analisi." : "Configura Supabase, poi importa i report Amazon.";

  el("kpis").innerHTML = [
    ["Report", imported + " / " + REPORTS.length],
    ["Righe", totalRows],
    ["Vendite", c.sales ? euro(c.sales) : "—"],
    ["Profitto", c.sales ? euro(c.profit) : "—"],
    ["Ads", c.ads ? euro(c.ads) : "—"],
    ["TACOS", pct(c.tacos)],
    ["ROAS", Number.isFinite(c.roas) ? c.roas.toFixed(2) : "—"],
    ["CTR", pct(c.ctr)]
  ].map(x => '<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("");

  el("requiredBox").innerHTML = REPORTS.map(r => {
    const ok = (state.counts[r.type] || 0) > 0;
    return '<div class="action"><b>'+r.name+'</b><br>' + (ok ? '<span class="status-ok">✓ importato</span> — '+state.counts[r.type]+' righe' : '<span class="'+(r.need==="obbligatorio"?'status-missing':'status-warn')+'">'+(r.need==="obbligatorio"?'mancante obbligatorio':'mancante')+'</span>') + '</div>';
  }).join("");

  el("actionBox").innerHTML = recs.slice(0,6).map(r => '<div class="action '+r[0]+'"><b>'+r[1]+'</b><br>'+r[2]+'</div>').join("");
  el("growthBox").innerHTML = '<div class="grid3">' + recs.map(r => '<div class="action '+r[0]+'"><b>'+r[1]+'</b><br>'+r[2]+'</div>').join("") + '</div>';

  el("statusGrid").innerHTML = REPORTS.map(r => {
    const ok = (state.counts[r.type] || 0) > 0;
    const l = state.latest[r.type];
    return '<div class="import-box '+(ok?'ok':'missing')+'"><h4>'+r.name+'</h4><p><span class="pill">'+r.need+'</span></p><div><b>Stato:</b> '+(ok?'🟢 Importato':'🔴 Mancante')+'</div><div><b>File:</b> '+(l && l.file_name ? l.file_name : '—')+'</div><div><b>Righe:</b> '+(state.counts[r.type] || 0)+'</div><div><b>Colonne:</b> '+(l && Array.isArray(l.headers) ? l.headers.length : '—')+'</div></div>';
  }).join("");

  el("reportsTable").innerHTML = state.log.length ? '<table><tr><th>Report</th><th>File</th><th>Righe</th><th>Colonne</th><th>Duplicato</th><th>Importato</th></tr>' + state.log.map(r => '<tr><td><span class="pill">'+label(r.report_type)+'</span></td><td>'+r.file_name+'</td><td>'+r.row_count+'</td><td>'+(Array.isArray(r.headers)?r.headers.length:'')+'</td><td>'+(r.is_duplicate?'sì':'no')+'</td><td>'+new Date(r.imported_at).toLocaleString("it-IT")+'</td></tr>').join("") + '</table>' : '<div class="action">Nessun report importato.</div>';

  const rows = asinRows();
  el("asinBox").innerHTML = rows.length ? '<table><tr><th>ASIN</th><th>Titolo</th><th>Vendite</th><th>Unità</th><th>Sessioni</th><th>Conv.</th></tr>' + rows.map(r => '<tr><td>'+r.asin+'</td><td>'+r.title+'</td><td>'+euro(r.sales)+'</td><td>'+r.units+'</td><td>'+r.sessions+'</td><td>'+(r.cr?r.cr+'%':'—')+'</td></tr>').join("") + '</table>' : '<div class="action">Importa Business Report o Transazioni.</div>';

  el("adsBox").innerHTML = '<div class="grid3"><div class="kpi"><small>Spesa Ads</small><strong>'+ (c.ads?euro(c.ads):"—") +'</strong></div><div class="kpi"><small>ACOS</small><strong>'+pct(c.acos)+'</strong></div><div class="kpi"><small>ROAS</small><strong>'+(Number.isFinite(c.roas)?c.roas.toFixed(2):"—")+'</strong></div><div class="kpi"><small>CPC</small><strong>'+(Number.isFinite(c.cpc)?euro(c.cpc):"—")+'</strong></div><div class="kpi"><small>CTR</small><strong>'+pct(c.ctr)+'</strong></div></div>';

  el("profitBox").innerHTML = '<div class="grid3"><div class="kpi"><small>Vendite</small><strong>'+(c.sales?euro(c.sales):"—")+'</strong></div><div class="kpi"><small>Commissioni</small><strong>'+(c.amazonFees?euro(c.amazonFees):"—")+'</strong></div><div class="kpi"><small>Ads</small><strong>'+(c.ads?euro(c.ads):"—")+'</strong></div><div class="kpi"><small>Costi BipBop</small><strong>'+(c.costsTotal?euro(c.costsTotal):"—")+'</strong></div><div class="kpi"><small>Profitto stimato</small><strong>'+(c.sales?euro(c.profit):"—")+'</strong></div><div class="kpi"><small>Margine</small><strong>'+(c.sales?pct(c.profit/c.sales*100):"—")+'</strong></div></div>';

  el("alertsBox").innerHTML = recs.map(r => '<div class="action '+r[0]+'">🚨 <b>'+r[1]+'</b><br>'+r[2]+'</div>').join("");

  el("diagnosticBox").innerHTML = '<div class="action"><b>SOLO TABELLE BB40 STABLE</b><br>Import log: '+state.log.length+'<br>Raw rows: '+totalRows+'<br>Report configurati: '+REPORTS.length+'<br>Storage: '+window.BIPBOP_CONFIG.storageKey+'</div>';
  el("errorBox").textContent = state.errors.length ? state.errors.join("\\n") : "Nessun errore.";
}

function show(view) {
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("active", s.id === view));
  const active = document.querySelector('.nav[data-view="'+view+'"]');
  if (active) el("pageTitle").textContent = active.textContent.replace(/[📊📥📁🚀📦📈💰🚨🧪⚙️]/g,"").trim();
}

function bind() {
  document.querySelectorAll(".nav").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
  el("refreshBtn").addEventListener("click", refresh);
  el("selectFilesBtn").addEventListener("click", () => el("multiFile").click());
  el("multiFile").addEventListener("change", e => importFiles(Array.from(e.target.files)));
  el("clearImportLogBtn").addEventListener("click", () => el("importLog").textContent = "Pronto.");

  const dz = el("dropZone");
  dz.addEventListener("click", () => el("multiFile").click());
  ["dragenter","dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave","drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("drag"); }));
  dz.addEventListener("drop", e => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().match(/\\.(csv|txt)$/));
    importFiles(files);
  });

  const cfg = window.BipBopDB.config();
  el("supabaseUrl").value = cfg.url || "";
  el("supabaseKey").value = cfg.key || "";
  el("saveSetup").addEventListener("click", () => {
    window.BipBopDB.saveConfig({ url: el("supabaseUrl").value.trim(), key: el("supabaseKey").value.trim() });
    alert("Configurazione salvata");
    refresh();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bind();
  render();
  refresh();
});
})();
