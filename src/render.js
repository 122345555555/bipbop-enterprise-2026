window.BBRender = {
  state:null,
  setState(s){ this.state=s; },
  fileCount(type){ return this.state.files.filter(f=>f.report_type===type && !f.is_duplicate).length; },
  latest(type){ return this.state.files.find(f=>f.report_type===type); },
  inventoryControls(){
    const get=id=>BBUtils.el(id);
    return {
      q:BBUtils.low(get("inventorySearch")?.value || ""),
      filter:get("inventoryFilter")?.value || "all",
      sort:get("inventorySort")?.value || "title",
      lowStock:Math.max(0, BBUtils.num(get("inventoryLowStock")?.value || 10))
    };
  },
  filteredInventoryRows(rows){
    const c=this.inventoryControls();
    const isActive=r=>["active","attivo"].includes(BBUtils.low(r.status));
    const hasValidAsin=r=>/^B0[A-Z0-9]{8}$/i.test(String(r.asin || ""));
    let out=rows.filter(r=>{
      if(c.q && !String(r.search || "").includes(c.q)) return false;
      if(c.filter==="active") return isActive(r);
      if(c.filter==="inactive") return !isActive(r);
      if(c.filter==="outofstock") return (r.quantity || 0)<=0;
      if(c.filter==="lowstock") return (r.quantity || 0)>0 && (r.quantity || 0)<=c.lowStock;
      if(c.filter==="missingasin") return !hasValidAsin(r);
      return true;
    });
    out=out.slice();
    if(c.sort==="qty_asc") out.sort((a,b)=>(a.quantity||0)-(b.quantity||0));
    else if(c.sort==="qty_desc") out.sort((a,b)=>(b.quantity||0)-(a.quantity||0));
    else if(c.sort==="price_desc") out.sort((a,b)=>(b.price||0)-(a.price||0));
    else if(c.sort==="price_asc") out.sort((a,b)=>(a.price||0)-(b.price||0));
    else out.sort((a,b)=>String(a.title||"").localeCompare(String(b.title||"")));
    return out;
  },
  keywordControls(){
    const get=id=>BBUtils.el(id);
    return {
      q:BBUtils.low(get("keywordSearch")?.value || ""),
      filter:get("keywordFilter")?.value || "all",
      sort:get("keywordSort")?.value || "priority",
      minClicks:Math.max(0, BBUtils.num(get("keywordMinClicks")?.value || 0))
    };
  },
  filteredKeywordRows(rows){
    const c=this.keywordControls();
    let out=rows.filter(r=>{
      if(c.q && !String(r.search || "").includes(c.q)) return false;
      if(c.filter!=="all" && r.decision!==c.filter) return false;
      if((r.clicks || 0)<c.minClicks) return false;
      return true;
    }).slice();
    if(c.sort==="sales_desc") out.sort((a,b)=>(b.sales||0)-(a.sales||0));
    else if(c.sort==="spend_desc") out.sort((a,b)=>(b.spend||0)-(a.spend||0));
    else if(c.sort==="acos_desc") out.sort((a,b)=>(Number.isFinite(b.acos)?b.acos:-1)-(Number.isFinite(a.acos)?a.acos:-1));
    else if(c.sort==="acos_asc") out.sort((a,b)=>(Number.isFinite(a.acos)?a.acos:999999)-(Number.isFinite(b.acos)?b.acos:999999));
    else if(c.sort==="clicks_desc") out.sort((a,b)=>(b.clicks||0)-(a.clicks||0));
    else out.sort((a,b)=>(a.priority||9)-(b.priority||9) || (b.sales||0)-(a.sales||0) || (b.spend||0)-(a.spend||0));
    return out;
  },
  keywordDecisionLabel(decision){
    return {
      scale:"Da spingere",
      protect:"Da proteggere",
      optimize:"Da ottimizzare",
      cut:"Da tagliare",
      test:"Da testare",
      observe:"Da osservare"
    }[decision] || "Da osservare";
  },
  profitControls(){
    const get=id=>BBUtils.el(id);
    return {
      year:get("profitYearFilter")?.value || "all",
      sort:get("profitSort")?.value || "sales_desc"
    };
  },
  syncProfitYears(yearRows){
    const sel=BBUtils.el("profitYearFilter");
    if(!sel) return;
    const current=sel.value || "all";
    const years=yearRows.map(r=>String(r.year)).filter(Boolean);
    sel.innerHTML='<option value="all">Tutti gli anni</option>'+years.map(y=>'<option value="'+BBUtils.html(y)+'">'+BBUtils.html(y)+'</option>').join("");
    sel.value=years.includes(current)?current:"all";
  },
  filteredProfitRows(rows){
    const c=this.profitControls();
    let out=rows.filter(r=>c.year==="all" || String(r.year)===c.year).slice();
    if(c.sort==="profit_desc") out.sort((a,b)=>(b.profit||0)-(a.profit||0));
    else if(c.sort==="profit_asc") out.sort((a,b)=>(a.profit||0)-(b.profit||0));
    else if(c.sort==="margin_desc") out.sort((a,b)=>(Number.isFinite(b.margin)?b.margin:-999999)-(Number.isFinite(a.margin)?a.margin:-999999));
    else if(c.sort==="margin_asc") out.sort((a,b)=>(Number.isFinite(a.margin)?a.margin:999999)-(Number.isFinite(b.margin)?b.margin:999999));
    else out.sort((a,b)=>(b.sales||0)-(a.sales||0));
    return out;
  },
  asinControls(){
    const get=id=>BBUtils.el(id);
    return {
      q:BBUtils.low(get("asinSearch")?.value || ""),
      filter:get("asinDecisionFilter")?.value || "all",
      sort:get("asinSort")?.value || "profit_desc"
    };
  },
  asinDecisionLabel(decision){
    return {
      scale:"Da spingere",
      protect:"Da proteggere",
      fix:"Da correggere",
      stock:"Controlla stock",
      watch:"Da monitorare"
    }[decision] || "Da monitorare";
  },
  filteredAsinDecisionRows(rows){
    const c=this.asinControls();
    let out=rows.filter(r=>{
      if(c.q && !String(r.search||"").includes(c.q)) return false;
      if(c.filter!=="all" && r.decision!==c.filter) return false;
      return true;
    }).slice();
    if(c.sort==="sales_desc") out.sort((a,b)=>(b.sales||0)-(a.sales||0));
    else if(c.sort==="profit_asc") out.sort((a,b)=>(a.profit||0)-(b.profit||0));
    else if(c.sort==="margin_asc") out.sort((a,b)=>(Number.isFinite(a.margin)?a.margin:999999)-(Number.isFinite(b.margin)?b.margin:999999));
    else if(c.sort==="units_desc") out.sort((a,b)=>(b.units||0)-(a.units||0));
    else out.sort((a,b)=>(b.profit||0)-(a.profit||0));
    return out;
  },
  renderAll(){
    const s=this.state;
    const h=BBUtils.html;
    const c=BBAnalytics.calc(s.samples);
    const rs=BBAnalytics.recommendations(c,s.counts);
    const totalRows=Object.values(s.counts).reduce((a,b)=>a+(b||0),0);
    const imported=BBAnalytics.reportDefs.filter(r=>(s.counts[r[0]]||0)>0).length;

    BBUtils.el("headline").textContent=imported?imported+" categorie report importate":"Amazon Growth Engine pronto";
    BBUtils.el("subline").textContent=imported?"Dati attivi deduplicati e aggregati dallo storico.":"Importa i report Amazon per generare KPI, alert e priorità.";
    BBUtils.el("kpis").innerHTML=[
      ["Vendite",c.sales?BBUtils.euro(c.sales):"—"],["Profitto",c.sales?BBUtils.euro(c.profit):"—"],["Margine",BBUtils.pct(c.margin)],["TACOS",BBUtils.pct(c.tacos)],
      ["ACOS",BBUtils.pct(c.acos)],["ROAS",Number.isFinite(c.roas)?c.roas.toFixed(2):"—"],["Sessioni",c.sessions||"—"],["Conversione",BBUtils.pct(c.conversion)]
    ].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("");

    BBUtils.el("topActions").innerHTML=rs.slice(0,6).map(r=>'<div class="action '+r[0]+'"><b>'+r[1]+'</b><br>'+r[2]+'</div>').join("");

    BBUtils.el("dataHealth").innerHTML=BBAnalytics.reportDefs.map(r=>{
      const ok=(s.counts[r[0]]||0)>0, fc=this.fileCount(r[0]);
      return '<div class="action"><b>'+h(r[1])+'</b><br>'+(ok?'<span class="status-ok">✓ importato</span> — '+fc+' file, '+s.counts[r[0]]+' righe':'<span class="'+(r[2]==="obbligatorio"?'status-missing':'status-warn')+'">'+(r[2]==="obbligatorio"?'mancante obbligatorio':'mancante')+'</span>')+'</div>';
    }).join("");

    BBUtils.el("statusGrid").innerHTML=BBAnalytics.reportDefs.map(r=>{
      const ok=(s.counts[r[0]]||0)>0, latest=this.latest(r[0]), fc=this.fileCount(r[0]);
      return '<div class="import-box '+(ok?'ok':'missing')+'"><h4>'+h(r[1])+'</h4><p><span class="pill">'+h(r[2])+'</span></p><b>Stato:</b> '+(ok?'🟢 Attivo':'⚪ Nessun file')+'<br><b>File attivi:</b> '+fc+'<br><b>Righe attive:</b> '+(s.counts[r[0]]||0)+'<br><b>Ultimo file:</b> '+h(latest?.file_name||'—')+'</div>';
    }).join("");

    BBUtils.el("archiveTable").innerHTML=s.files.length?'<table><tr><th>Report</th><th>File</th><th>Righe</th><th>Colonne</th><th>Duplicato</th><th>Hash</th><th>Importato</th><th>Azione</th></tr>'+s.files.map(f=>'<tr><td><span class="pill">'+h(BBAnalytics.label(f.report_type))+'</span></td><td>'+h(f.file_name)+'</td><td>'+h(f.row_count)+'</td><td>'+h(f.column_count)+'</td><td>'+(f.is_duplicate?'<span class="pill red">sì, non sommato</span>':'<span class="pill green">no</span>')+'</td><td class="small">'+h(String(f.fingerprint||"").slice(0,12))+'...</td><td>'+h(new Date(f.imported_at).toLocaleString("it-IT"))+'</td><td><button class="secondaryBtn deleteFileBtn" data-file-id="'+h(f.id)+'" data-file-name="'+h(f.file_name)+'">Elimina</button></td></tr>').join("")+'</table>':'<div class="action">Nessun report importato.</div>';

    BBUtils.el("salesBox").innerHTML='<div class="grid3">'+[
      ["Vendite",c.sales?BBUtils.euro(c.sales):"—"],["Unità",c.units||"—"],["Sessioni",c.sessions||"—"],["Conversione",BBUtils.pct(c.conversion)],["Commissioni Amazon",BBUtils.euro(c.amazonFees)],["Profitto stimato",c.sales?BBUtils.euro(c.profit):"—"],
      ["Da Business Report",c.salesBR?BBUtils.euro(c.salesBR):"—"],["Da Transazioni",c.salesTX?BBUtils.euro(c.salesTX):"—"],["Da Report ordini",c.salesOrders?BBUtils.euro(c.salesOrders):"—"]
    ].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div><p class="hint">Se manca il Business Report, i ricavi vengono stimati dal Report ordini usando il campo item-price.</p>';

    BBUtils.el("adsBox").innerHTML='<div class="grid3">'+[
      ["Spesa Ads",c.ads?BBUtils.euro(c.ads):"—"],["Vendite Ads",c.adsSales?BBUtils.euro(c.adsSales):"—"],["ACOS",BBUtils.pct(c.acos)],["ROAS",Number.isFinite(c.roas)?c.roas.toFixed(2):"—"],["CPC",Number.isFinite(c.cpc)?BBUtils.euro(c.cpc):"—"],["CTR",BBUtils.pct(c.ctr)]
    ].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>';
    const adFiles=s.files.filter(x=>["sponsored_products","sponsored_brands","sponsored_display"].includes(x.report_type)&&!x.is_duplicate);
    BBUtils.el("adsFilesBox").innerHTML=adFiles.length?'<h3>File Ads attivi</h3><table><tr><th>Tipo</th><th>File</th><th>Righe</th></tr>'+adFiles.map(f=>'<tr><td>'+h(BBAnalytics.label(f.report_type))+'</td><td>'+h(f.file_name)+'</td><td>'+h(f.row_count)+'</td></tr>').join("")+'</table>':'';

    const adr=BBAnalytics.asinDecisionRows ? BBAnalytics.asinDecisionRows(s.samples) : [];
    const adf=this.filteredAsinDecisionRows(adr);
    const asinCount=key=>adr.filter(r=>r.decision===key).length;
    BBUtils.el("asinBox").innerHTML=adr.length?'<div class="grid3">'+[
      ["Da spingere",asinCount("scale")],
      ["Da proteggere",asinCount("protect")],
      ["Da correggere",asinCount("fix")],
      ["Controlla stock",asinCount("stock")],
      ["Da monitorare",asinCount("watch")],
      ["Profitto ASIN",BBUtils.euro(adr.reduce((a,r)=>a+(r.profit||0),0))]
    ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><p class="hint">Risultati mostrati: '+adf.length+' su '+adr.length+'. Le decisioni combinano ordini, Profit Report e inventario.</p><table class="decision-table"><tr><th>Decisione</th><th>ASIN</th><th>SKU / Titolo</th><th>Azione</th><th>Vendite</th><th>Unità</th><th>Profitto</th><th>Margine</th><th>Stock</th><th>Fonte</th></tr>'+adf.map(r=>'<tr><td><span class="pill decision-'+h(r.decision)+'">'+h(this.asinDecisionLabel(r.decision))+'</span></td><td>'+h(r.asin)+'</td><td>'+h(r.sku||r.title||"")+'</td><td>'+h(r.action)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td class="'+((r.profit||0)<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.profit))+'</td><td>'+h(BBUtils.pct(r.margin))+'</td><td>'+h(r.stock===null?"—":r.stock)+'</td><td class="small">'+h(r.source)+'</td></tr>').join("")+'</table>':'<div class="action">Importa Report ordini, Inventario e Profit Report per vedere decisioni ASIN.</div>';

    const ir=BBAnalytics.inventoryRows ? BBAnalytics.inventoryRows(s.samples) : [];
    const invEl=BBUtils.el("inventoryBox");
    if(invEl){
      const fr=this.filteredInventoryRows(ir);
      const activeCount=ir.filter(r=>["active","attivo"].includes(BBUtils.low(r.status))).length;
      const lowStock=this.inventoryControls().lowStock;
      const lowCount=ir.filter(r=>(r.quantity||0)>0 && (r.quantity||0)<=lowStock).length;
      const outCount=ir.filter(r=>(r.quantity||0)<=0).length;
      invEl.innerHTML=ir.length?'<div class="grid3">'+[
        ["SKU totali",ir.length],
        ["Attivi",activeCount],
        ["Sotto scorta",lowCount],
        ["Esauriti",outCount],
        ["Quantità totale",ir.reduce((a,r)=>a+(r.quantity||0),0)],
        ["Valore listino",BBUtils.euro(ir.reduce((a,r)=>a+((r.price||0)*(r.quantity||0)),0))]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><p class="hint">Risultati mostrati: '+fr.length+' su '+ir.length+'.</p><table class="compact-table"><tr><th>SKU</th><th>ASIN</th><th>Prodotto</th><th>Prezzo</th><th>Quantità</th><th>Stato</th><th>Canale</th></tr>'+fr.map(r=>'<tr><td>'+h(r.sku)+'</td><td>'+h(r.asin)+'</td><td class="product-cell">'+h(r.title)+'</td><td>'+h(BBUtils.euro(r.price))+'</td><td class="'+((r.quantity||0)<=0?'stock-bad':((r.quantity||0)<=lowStock?'stock-warn':''))+'">'+h(r.quantity)+'</td><td>'+h(r.status)+'</td><td>'+h(r.channel)+'</td></tr>').join("")+'</table>':'<div class="action">Importa il Report di tutte le offerte per vedere SKU, ASIN, prezzo, quantità e stato.</div>';
    }

    const kr=BBAnalytics.keywordRows(s.samples);
    const kf=this.filteredKeywordRows(kr);
    const decisionCount=key=>kr.filter(r=>r.decision===key).length;
    BBUtils.el("keywordBox").innerHTML=kr.length?'<div class="grid3">'+[
      ["Da spingere",decisionCount("scale")],
      ["Da proteggere",decisionCount("protect")],
      ["Da ottimizzare",decisionCount("optimize")],
      ["Da tagliare",decisionCount("cut")],
      ["Da testare",decisionCount("test")],
      ["Spesa analizzata",BBUtils.euro(kr.reduce((a,r)=>a+(r.spend||0),0))]
    ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><p class="hint">Risultati mostrati: '+kf.length+' su '+kr.length+'. Le decisioni sono una prima lettura automatica: conferma sempre con margine prodotto e disponibilità inventario.</p><table class="decision-table"><tr><th>Decisione</th><th>Keyword / Search Term</th><th>Azione</th><th>Spesa</th><th>Vendite</th><th>Click</th><th>CTR</th><th>CPC</th><th>ACOS</th><th>ROAS</th><th>Fonte</th></tr>'+kf.map(r=>'<tr><td><span class="pill decision-'+h(r.decision)+'">'+h(this.keywordDecisionLabel(r.decision))+'</span></td><td>'+h(r.term)+'</td><td>'+h(r.action)+'</td><td>'+h(BBUtils.euro(r.spend))+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.clicks)+'</td><td>'+h(BBUtils.pct(r.ctr))+'</td><td>'+h(Number.isFinite(r.cpc)?BBUtils.euro(r.cpc):"—")+'</td><td>'+h(BBUtils.pct(r.acos))+'</td><td>'+h(Number.isFinite(r.roas)?r.roas.toFixed(2):"—")+'</td><td class="small">'+h(r.source)+'</td></tr>').join("")+'</table>':'<div class="action">Importa Search Terms o report Sponsored Products per capire keyword decisive, sprechi e opportunità di investimento.</div>';

    
    const ba=BBAnalytics.brandAnalyticsRows ? BBAnalytics.brandAnalyticsRows(s.samples) : [];
    const baEl=BBUtils.el("brandAnalyticsBox");
    if(baEl){
      baEl.innerHTML=ba.length?'<table><tr><th>Query</th><th>Volume</th><th>Impression totali</th><th>Quota impression brand</th><th>Quota click brand</th><th>Quota acquisti brand</th></tr>'+ba.map(r=>'<tr><td>'+h(r.query)+'</td><td>'+h(r.volume)+'</td><td>'+h(r.impTotal)+'</td><td>'+h(BBUtils.pct(r.brandImpShare))+'</td><td>'+h(BBUtils.pct(r.clickShare))+'</td><td>'+h(BBUtils.pct(r.purchaseShare))+'</td></tr>').join("")+'</table>':'<div class="action">Importa Brand Analytics – Performance query di ricerca.</div>';
    }

    BBUtils.el("profitBox").innerHTML='<div class="grid3">'+[
      ["Ricavi",BBUtils.euro(c.sales)],["Commissioni Amazon",BBUtils.euro(c.amazonFees)],["Ads",BBUtils.euro(c.ads)],["Profitto",BBUtils.euro(c.profit)],["Margine",BBUtils.pct(c.margin)],["TACOS",BBUtils.pct(c.tacos)],
      ["Da Profit Report",c.netProfitReport?BBUtils.euro(c.netProfitReport):"—"],["Ricavi Profit Report",c.salesProfit?BBUtils.euro(c.salesProfit):"—"],["Fee Profit Report",c.amazonFeesProfit?BBUtils.euro(c.amazonFeesProfit):"—"]
    ].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>';
    const pr=BBAnalytics.profitRows ? BBAnalytics.profitRows(s.samples) : [];
    const py=BBAnalytics.profitYearRows ? BBAnalytics.profitYearRows(s.samples) : [];
    this.syncProfitYears(py);
    const pf=this.filteredProfitRows(pr);
    BBUtils.el("profitBox").innerHTML += py.length?'<h3>Riepilogo per anno</h3><div class="grid3">'+py.map(r=>'<div class="kpi"><small>'+h(r.year)+' — '+h(r.asinCount)+' ASIN/SKU</small><strong>'+h(BBUtils.euro(r.profit))+'</strong><br><span class="small">Vendite '+h(BBUtils.euro(r.sales))+' · Margine '+h(BBUtils.pct(r.margin))+'</span></div>').join("")+'</div>':'';
    BBUtils.el("profitBox").innerHTML += pr.length?'<h3>Profitto per ASIN</h3><p class="hint">Risultati mostrati: '+pf.length+' su '+pr.length+'.</p><table><tr><th>Anno</th><th>ASIN</th><th>SKU</th><th>Vendite</th><th>Unità</th><th>Profitto</th><th>Margine</th></tr>'+pf.map(r=>'<tr><td>'+h(r.year)+'</td><td>'+h(r.asin)+'</td><td>'+h(r.sku)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td class="'+((r.profit||0)<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.profit))+'</td><td>'+h(BBUtils.pct(r.margin))+'</td></tr>').join("")+'</table>':'<p class="hint">Carica il Profit Report per vedere profitto e margine per ASIN. I costi interni potranno essere collegati dopo.</p>';

    BBUtils.el("growthBox").innerHTML='<div class="grid3">'+rs.map(r=>'<div class="action '+r[0]+'"><b>'+r[1]+'</b><br>'+r[2]+'</div>').join("")+'</div>';

    const decisionEl=BBUtils.el("decisionBox");
    if(decisionEl){
      decisionEl.innerHTML=rs.map((r,i)=>'<div class="action '+r[0]+'"><b>Priorità '+(i+1)+' — '+r[1]+'</b><br><b>Perché:</b> '+r[2]+'<br><b>Azione consigliata:</b> '+(r[1].includes("Business Report")?"Importa il Business Report per sbloccare analisi ASIN e conversione.":r[1].includes("Transazioni")?"Importa Transazioni per calcolare commissioni e profitto reale.":r[1].includes("Fatture")?"Importa o usa i report Ads per riconciliare la spesa pubblicitaria.":r[1].includes("TACOS")?"Riduci budget sulle campagne meno efficienti o migliora conversione della scheda.":r[1].includes("ACOS")?"Analizza keyword/campagne con spesa alta e vendite basse.":r[1].includes("CTR")?"Testa nuova immagine principale, titolo e creatività Sponsored Brand.":"Procedi con questa priorità prima delle ottimizzazioni secondarie.")+'</div>').join("");
    }
    BBUtils.el("alertsBox").innerHTML=rs.map(r=>'<div class="action '+r[0]+'">🚨 <b>'+r[1]+'</b><br>'+r[2]+'</div>').join("");
    BBUtils.el("diagnosticBox").innerHTML='<div class="action"><b>SOLO TABELLE BB100 GROWTH ENGINE</b><br>Report files: '+s.files.length+'<br>Raw rows attive: '+totalRows+'<br>Report configurati: '+BBAnalytics.reportDefs.length+'<br>Storage: '+window.BIPBOP_CONFIG.storageKey+'</div>';
    BBUtils.el("errorBox").textContent=s.errors.length?s.errors.join("\\n"):"Nessun errore.";
  }
};
