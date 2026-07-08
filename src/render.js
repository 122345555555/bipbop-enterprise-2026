window.BBRender = {
  state:null,
  setState(s){ this.state=s; },
  fileCount(type){ return this.state.files.filter(f=>f.report_type===type && !f.is_duplicate).length; },
  latest(type){ return this.state.files.find(f=>f.report_type===type); },
  activeProfitFiles(state=this.state){
    return (state.files||[]).filter(f=>f.report_type==="profit_report" && !f.is_duplicate);
  },
  profitScopedSamples(state=this.state){
    const files=this.activeProfitFiles(state);
    if(files.length<=1) return state.samples;
    const latest=files[0]?.file_name;
    return {
      ...state.samples,
      profit_report:(state.samples.profit_report||[]).filter(r=>r.__file_name===latest)
    };
  },
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
  asinCell(asin,title){
    const h=BBUtils.html;
    return '<div class="asin-cell"><b>'+h(asin||"N/D")+'</b>'+(title?'<span>'+h(title)+'</span>':'')+'</div>';
  },
  textCell(main,sub){
    const h=BBUtils.html;
    return '<div class="asin-cell"><b>'+h(main||"—")+'</b>'+(sub?'<span>'+h(sub)+'</span>':'')+'</div>';
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
    const scopedSamples=this.profitScopedSamples(s);
    const profitFiles=this.activeProfitFiles(s);
    const activeProfitFile=profitFiles[0]?.file_name || "";
    const c=BBAnalytics.calc(scopedSamples);
    const rs=BBAnalytics.recommendations(c,s.counts);
    const totalRows=Object.values(s.counts).reduce((a,b)=>a+(b||0),0);
    const imported=BBAnalytics.reportDefs.filter(r=>(s.counts[r[0]]||0)>0).length;

    BBUtils.el("headline").textContent=imported?imported+" categorie report importate":"Amazon Growth Engine pronto";
    BBUtils.el("subline").textContent=imported?"Dati attivi deduplicati e aggregati dallo storico.":"Importa i report Amazon per generare KPI, alert e priorità.";
    BBUtils.el("kpis").innerHTML=[
      ["Vendite",c.sales?BBUtils.euro(c.sales):"—"],["Profitto",c.sales?BBUtils.euro(c.profit):"—"],["Margine",BBUtils.pct(c.margin)],["TACOS",BBUtils.pct(c.tacos)],
      ["ACOS",BBUtils.pct(c.acos)],["ROAS",Number.isFinite(c.roas)?c.roas.toFixed(2):"—"],["Store",c.storeSales?BBUtils.euro(c.storeSales):"—"],["Conversione Store",BBUtils.pct(c.storeConversion)]
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

    const adr=BBAnalytics.asinDecisionRows ? BBAnalytics.asinDecisionRows(scopedSamples) : [];
    const adf=this.filteredAsinDecisionRows(adr);
    const asinCount=key=>adr.filter(r=>r.decision===key).length;
    BBUtils.el("asinBox").innerHTML=adr.length?'<div class="grid3">'+[
      ["Da spingere",asinCount("scale")],
      ["Da proteggere",asinCount("protect")],
      ["Da correggere",asinCount("fix")],
      ["Controlla stock",asinCount("stock")],
      ["Da monitorare",asinCount("watch")],
      ["Profitto ASIN",BBUtils.euro(adr.reduce((a,r)=>a+(r.profit||0),0))]
    ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><p class="hint">Risultati mostrati: '+adf.length+' su '+adr.length+'. Le decisioni combinano ordini, Profit Report e inventario.</p><table class="decision-table"><tr><th>Decisione</th><th>ASIN / Prodotto</th><th>SKU</th><th>Azione</th><th>Vendite</th><th>Unità</th><th>Profitto</th><th>Margine</th><th>Stock</th><th>Fonte</th></tr>'+adf.map(r=>'<tr><td><span class="pill decision-'+h(r.decision)+'">'+h(this.asinDecisionLabel(r.decision))+'</span></td><td>'+this.asinCell(r.asin,r.title)+'</td><td>'+h(r.sku||"")+'</td><td>'+h(r.action)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td class="'+((r.profit||0)<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.profit))+'</td><td>'+h(BBUtils.pct(r.margin))+'</td><td>'+h(r.stock===null?"—":r.stock)+'</td><td class="small">'+h(r.source)+'</td></tr>').join("")+'</table>':'<div class="action">Importa Report ordini, Inventario e Profit Report per vedere decisioni ASIN.</div>';

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

    const recoveryEl=BBUtils.el("recoveryBox");
    if(recoveryEl){
      const rec=BBAnalytics.salesRecovery ? BBAnalytics.salesRecovery(scopedSamples,c,s.counts) : null;
      const dateLabel=d=>d?d.toLocaleDateString("it-IT"):"—";
      const statusText=rec?.featured.status==="critical"?"Critica":(rec?.featured.status==="warning"?"Da controllare":(rec?.featured.status==="ok"?"Buona":"Dato mancante"));
      recoveryEl.innerHTML=rec?'<div class="grid3">'+[
        ["Giorni senza vendite",rec.daysWithoutSales===null?"—":rec.daysWithoutSales],
        ["Ultima vendita",dateLabel(rec.lastSale?.date)],
        ["Traffico ultimi 30gg",rec.trafficLast30||"—"],
        ["Vendite ultimi 30gg",BBUtils.euro(rec.salesLast30)],
        ["Unità ultimi 30gg",rec.unitsLast30||"—"],
        ["Featured Offer",rec.featured.latest?BBUtils.pct(rec.featured.latest.value):"—"]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      '<h3>Problemi identificati</h3><table class="decision-table"><tr><th>Priorità</th><th>Area</th><th>Problema</th><th>Perché</th><th>Azione</th></tr>'+rec.actions.map((r,i)=>'<tr><td><span class="pill '+(r.type==="red"?'red':(r.type==="green"?'green':''))+'">'+h(i+1)+'</span></td><td>'+h(r.area)+'</td><td><b>'+h(r.title)+'</b><br><span class="small">'+h(r.item)+'</span></td><td>'+h(r.why)+'</td><td>'+h(r.action)+'</td></tr>').join("")+'</table>'+
      '<h3>Modello logistico</h3><div class="grid3">'+[
        ["Modello",rec.logistics.label],
        ["Giorni preparazione",rec.logistics.handlingDays],
        ["Capacità/settimana",rec.logistics.weeklyCapacity||"—"]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><div class="action '+(rec.logistics.mode==="merchant"?'green':'yellow')+'"><b>'+h(rec.logistics.mode==="merchant"?"Produzione su ordine attiva":"Modello logistico da controllare")+'</b><br>'+h(rec.logistics.mode==="merchant"?"La dashboard non interpreta automaticamente stock fisico zero come errore FBA. Controlla invece che l'offerta sia acquistabile, producibile e con tempi competitivi.":"Se usi stock o FBA su alcuni prodotti, verifica disponibilita' reale dei top seller.")+'</div>'+
      '<h3>Acquistabilita\' e disponibilita\'</h3><div class="grid3">'+[
        ["SKU inventario",rec.inventory.total||"—"],
        [rec.logistics.mode==="fba"?"Stock zero":"Quantita' zero da verificare",rec.inventory.outOfStock||0],
        ["Sotto scorta",rec.inventory.lowStock||0]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      (rec.inventory.topOutOfStock.length?'<table><tr><th>ASIN / Prodotto</th><th>SKU</th><th>Vendite</th><th>Unità</th><th>Profitto</th><th>Quantità</th><th>Azione</th></tr>'+rec.inventory.topOutOfStock.map(r=>'<tr><td>'+this.asinCell(r.asin,r.title)+'</td><td>'+h(r.sku||"")+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td>'+h(BBUtils.euro(r.profit))+'</td><td class="stock-bad">'+h(r.stock)+'</td><td>'+h(rec.logistics.mode==="fba"?r.action:"Verifica che l'offerta FBM sia acquistabile e che tu riesca a produrlo/spedirlo nei tempi dichiarati.")+'</td></tr>').join("")+'</table>':'<div class="action '+(rec.hasInventory?'green':'yellow')+'"><b>Disponibilita\' critica non evidente</b><br>'+(rec.hasInventory?'Nei dati caricati non vedo top seller con quantita\' zero da trattare come blocco immediato.':'Carica il report Inventario per controllare prodotti non attivi, quantita\' offerta e disponibilita\'.')+'</div>')+
      '<h3>Featured Offer / Buy Box</h3><div class="grid3">'+[
        ["Stato",statusText],
        ["Ultimo valore",rec.featured.latest?BBUtils.pct(rec.featured.latest.value):"—"],
        ["Media rilevata",BBUtils.pct(rec.featured.avg)],
        ["Minimo rilevato",BBUtils.pct(rec.featured.min)],
        ["Righe con dato",rec.featured.rows.length],
        ["Ultima data",dateLabel(rec.featured.latest?.date)]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      (!rec.featured.rows.length?'<div class="action yellow"><b>Dato Featured Offer mancante</b><br>Carica il Business Report con la colonna Featured Offer / Buy Box per misurare il calo automatico.</div>':'<div class="action '+(rec.featured.status==="critical"?'red':(rec.featured.status==="warning"?'yellow':'green'))+'"><b>Interpretazione</b><br>Sotto 95% va controllata. Sotto 85% e\' critica: prezzo, disponibilita\', consegna e salute account possono bloccare le conversioni.</div>')+
      '<h3>Traffico ma zero vendite</h3>'+
      (rec.zeroTraffic.length?'<table><tr><th>Fonte</th><th>ASIN / Pagina</th><th>Traffico</th><th>Vendite</th><th>Unità</th><th>Azione</th></tr>'+rec.zeroTraffic.map(r=>'<tr><td>'+h(r.source)+'</td><td>'+(r.asin?this.asinCell(r.asin,r.title):this.textCell(r.page,r.source))+'</td><td>'+h(r.traffic)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td>'+h(r.action)+'</td></tr>').join("")+'</table>':'<div class="action '+(rec.hasBusinessReport||rec.hasStore?'green':'yellow')+'"><b>Nessun traffico senza vendite rilevato</b><br>'+(rec.hasBusinessReport||rec.hasStore?'Con i report attuali non vedo pagine o ASIN sopra soglia con zero vendite.':'Carica Business Report e report Store per vedere ASIN e pagine con visite ma zero conversioni.')+'</div>')+
      '<h3>Azioni immediate</h3><div class="grid2">'+rec.checklists.map(block=>'<div class="action"><b>'+h(block.title)+'</b><ol>'+block.steps.map(step=>'<li>'+h(step)+'</li>').join("")+'</ol></div>').join("")+'</div>':'<div class="action">Carica report per attivare Sales Recovery.</div>';
    }

    const storeEl=BBUtils.el("storeBox");
    if(storeEl){
      const st=BBAnalytics.storeInsights ? BBAnalytics.storeInsights(scopedSamples,c) : null;
      const fmtRate=v=>Number.isFinite(v)?v.toFixed(2):"—";
      const storeHasData=st && (st.storeViews || st.pages.length || st.sources.length || st.categories.length);
      storeEl.innerHTML=storeHasData?'<div class="grid3">'+[
        ["Vendite Store",BBUtils.euro(st.storeSales)],
        ["Unità Store",st.storeUnits||"—"],
        ["Ordini Store",st.storeOrders||"—"],
        ["Visitatori",st.storeVisitors||"—"],
        ["Nuovi visitatori",st.storeNewVisitors||"—"],
        ["Vendite / visitatore",Number.isFinite(c.storeSalesPerVisitor)?BBUtils.euro(c.storeSalesPerVisitor):"—"]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      '<h3>Scelta prodotto: cosa conviene sviluppare</h3><p class="hint">Lettura pratica per decidere se creare varianti di disegno, greche, adesivi murali o quadri. Incrocia Profit Report, keyword e dati Store.</p>'+
      (st.categories.length?'<table class="decision-table"><tr><th>Decisione</th><th>Categoria</th><th>Azione</th><th>Vendite</th><th>Unità</th><th>Profitto</th><th>Visite Store</th><th>Conversione</th><th>Pagine / prodotti</th></tr>'+st.categories.map(r=>'<tr><td><span class="pill">'+h(r.decision)+'</span></td><td><b>'+h(r.category)+'</b></td><td>'+h(r.action)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td class="'+((r.profit||0)<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.profit))+'</td><td>'+h(r.visits||"—")+'</td><td>'+h(BBUtils.pct(r.conversion))+'</td><td class="small">'+h(r.pages || r.products || "—")+'</td></tr>').join("")+'</table>':'<div class="action">Carica Profit Report, Keyword e Store per generare scelte prodotto.</div>')+
      '<h3>Fonti traffico Store</h3>'+
      (st.sources.length?'<table><tr><th>Decisione</th><th>Fonte</th><th>Azione</th><th>Vendite</th><th>Unità</th><th>Visite</th><th>Vendite / visita</th><th>Rimbalzo</th></tr>'+st.sources.map(r=>'<tr><td><span class="pill">'+h(r.decision)+'</span></td><td>'+h(r.name)+'</td><td>'+h(r.action)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td>'+h(r.visits)+'</td><td>'+h(BBUtils.euro(r.salesPerVisit))+'</td><td>'+h(BBUtils.pct(r.bounce*100))+'</td></tr>').join("")+'</table>':'<div class="action">Carica il report Store source per capire da dove arrivano traffico e vendite.</div>')+
      '<h3>Pagine Store</h3>'+
      (st.pages.length?'<table><tr><th>Decisione</th><th>Pagina</th><th>Azione</th><th>Vendite</th><th>Ordini</th><th>Visualizzazioni</th><th>Visite</th><th>Conv.</th></tr>'+st.pages.map(r=>'<tr><td><span class="pill">'+h(r.decision)+'</span></td><td>'+h(r.name)+'</td><td>'+h(r.action)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.orders)+'</td><td>'+h(r.views)+'</td><td>'+h(r.visits)+'</td><td>'+h(BBUtils.pct(r.orderRate))+'</td></tr>').join("")+'</table>':'<div class="action">Carica livePage e notLivePage per valutare le pagine Store.</div>')+
      '<h3>Periodo e stagionalità</h3>'+
      (st.bestDays.length?'<p class="hint">Giorni con vendite Store: utili per capire quando il pubblico reagisce meglio e se una categoria e\' stagionale.</p><table><tr><th>Giorno</th><th>Vendite</th><th>Unità</th><th>Ordini</th><th>Visitatori</th><th>Visualizzazioni</th></tr>'+st.bestDays.map(r=>'<tr><td>'+h(r.name)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td>'+h(r.orders)+'</td><td>'+h(r.visits)+'</td><td>'+h(r.views)+'</td></tr>').join("")+'</table>':'<div class="action">Carica il report Store per data per leggere periodo e stagionalità.</div>'):'<div class="action">Importa i report Store Amazon: date, livePage, notLivePage e source. Servono per capire traffico, pagine e categorie da sviluppare.</div>';
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
    BBUtils.el("profitBox").innerHTML += '<h3>Riconciliazione saldo</h3><div class="grid3">'+[
      ["Profitto Amazon",BBUtils.euro(c.netProfitReport||c.profit)],
      ["ADS fatturate",BBUtils.euro(c.ads)],
      ["ADS già nel Profit Report",BBUtils.euro(c.adsProfitReport)],
      ["ADS extra da sottrarre",BBUtils.euro(c.adsExtra)],
      ["Canone stimato",BBUtils.euro(c.subscriptionCost)],
      ["Saldo finale stimato",BBUtils.euro(c.reconciledProfit)]
    ].map(x=>'<div class="kpi '+(x[0]==="Saldo finale stimato" ? ((c.reconciledProfit||0)<0?'recon-bad':'recon-good') : '')+'"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><p class="hint">Formula: Profitto Amazon - ADS extra non già incluse - canone stimato. Saldo prudente sottraendo tutte le ADS fatturate: <b>'+h(BBUtils.euro(c.conservativeProfit))+'</b>.</p>';
    BBUtils.el("profitBox").innerHTML += '<h3>Conto economico manuale</h3><div class="grid3">'+[
      ["Vendite totali",BBUtils.euro(c.sales)],
      ["N. vendite",c.units||"—"],
      ["Prezzo medio",Number.isFinite(c.avgPrice)?BBUtils.euro(c.avgPrice):"—"],
      ["Canone Amazon",BBUtils.euro(c.subscriptionCost)],
      ["Commissioni segnalazione",BBUtils.euro(c.referralFeesProfit)],
      ["Spese ADS",BBUtils.euro(c.ads)],
      ["Produzione",BBUtils.euro(c.productionCost)],
      ["Spedizione",BBUtils.euro(c.shippingCost)],
      ["Altri costi fissi",BBUtils.euro(c.extraFixedCosts)],
      ["Saldo manuale",BBUtils.euro(c.manualBalance)]
    ].map(x=>'<div class="kpi '+(x[0]==="Saldo manuale" ? ((c.manualBalance||0)<0?'recon-bad':'recon-good') : '')+'"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><p class="hint">Formula manuale: vendite totali - commissioni segnalazione - ADS - canone - produzione - spedizione - altri costi fissi. Inserisci produzione e spedizione in Setup.</p>';
    if(profitFiles.length>1){
      BBUtils.el("profitBox").innerHTML += '<div class="action yellow"><b>Attenzione: più Profit Report attivi</b><br>Per evitare doppi conteggi sto usando solo l’ultimo Profit Report caricato: <b>'+h(activeProfitFile)+'</b>. Gli altri restano in archivio ma non vengono sommati nei KPI principali.</div>';
    }
    const pr=BBAnalytics.profitRows ? BBAnalytics.profitRows(scopedSamples) : [];
    const py=BBAnalytics.profitYearRows ? BBAnalytics.profitYearRows(scopedSamples) : [];
    this.syncProfitYears(py);
    const pf=this.filteredProfitRows(pr);
    BBUtils.el("profitBox").innerHTML += py.length?'<h3>Riepilogo per anno</h3><div class="grid3">'+py.map(r=>'<div class="kpi"><small>'+h(r.year)+' — '+h(r.asinCount)+' ASIN/SKU</small><strong>'+h(BBUtils.euro(r.profit))+'</strong><br><span class="small">Vendite '+h(BBUtils.euro(r.sales))+' · Margine '+h(BBUtils.pct(r.margin))+'</span></div>').join("")+'</div>':'';
    BBUtils.el("profitBox").innerHTML += pr.length?'<h3>Profitto per ASIN</h3><p class="hint">Risultati mostrati: '+pf.length+' su '+pr.length+'.</p><table><tr><th>Anno</th><th>ASIN / Prodotto</th><th>SKU</th><th>Vendite</th><th>Unità</th><th>Profitto</th><th>Margine</th></tr>'+pf.map(r=>'<tr><td>'+h(r.year)+'</td><td>'+this.asinCell(r.asin,r.title)+'</td><td>'+h(r.sku)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td class="'+((r.profit||0)<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.profit))+'</td><td>'+h(BBUtils.pct(r.margin))+'</td></tr>').join("")+'</table>':'<p class="hint">Carica il Profit Report per vedere profitto e margine per ASIN. I costi interni potranno essere collegati dopo.</p>';

    const strategy=BBAnalytics.productStrategyRows ? BBAnalytics.productStrategyRows(scopedSamples) : [];
    const weekly=BBAnalytics.weeklyActionPlan ? BBAnalytics.weeklyActionPlan(scopedSamples,c,s.counts) : null;
    const weeklyEl=BBUtils.el("weeklyBox");
    if(weeklyEl){
      weeklyEl.innerHTML=weekly?'<div class="grid3">'+[
        ["Focus periodo",weekly.season.season],
        ["Obiettivo",weekly.season.focus],
        ["Azione stagionale",weekly.season.action]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      '<h3>Azioni di questa settimana</h3><table class="decision-table"><tr><th>Priorità</th><th>Area</th><th>Cosa</th><th>Perché</th><th>Azione</th></tr>'+weekly.actions.map(r=>'<tr><td><span class="pill '+(r.priority==="Alta"?'red':'')+'">'+h(r.priority)+'</span></td><td>'+h(r.group)+'</td><td><b>'+h(r.item)+'</b><br><span class="small">'+h(r.detail||"")+'</span></td><td>'+h(r.why)+'</td><td>'+h(r.action)+'</td></tr>').join("")+'</table>'+
      '<h3>Budget test consigliato</h3>'+
      (weekly.budgetTests.length?'<table><tr><th>Test</th><th>Budget</th><th>Obiettivo</th><th>Misura</th></tr>'+weekly.budgetTests.map(r=>'<tr><td>'+h(r.test)+'</td><td><b>'+h(r.budget)+'</b></td><td>'+h(r.goal)+'</td><td>'+h(r.metric)+'</td></tr>').join("")+'</table>':'<div class="action">Nessun test budget chiaro: carica piu report o seleziona una categoria manualmente.</div>')+
      '<div class="action yellow"><b>Promemoria report</b><br>Ogni martedi carica: Business Report, ordini, Profit Report SKU, Fatture Ads, Sponsored Brands/Products, Search Terms, Inventario, Brand Analytics e Store date/livePage/notLivePage/source.</div>':'<div class="action">Carica i report per generare il piano settimanale.</div>';
    }

    const trendsEl=BBUtils.el("trendsBox");
    if(trendsEl){
      const trends=BBAnalytics.trendIdeas ? BBAnalytics.trendIdeas(scopedSamples,c) : [];
      const season=BBAnalytics.seasonalFocus ? BBAnalytics.seasonalFocus() : null;
      trendsEl.innerHTML='<div class="grid3">'+[
        ["Target primario","Nuovi genitori / mamme"],
        ["Target regalo","Nonni, zie, baby shower"],
        ["Periodo",season?season.season:"—"]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      (season?'<div class="action green"><b>Focus stagionale</b><br>'+h(season.focus)+' — '+h(season.action)+'</div>':'')+
      '<h3>Idee prodotto da valutare</h3><table class="decision-table"><tr><th>Priorità</th><th>Idea</th><th>Target</th><th>Formato</th><th>Palette</th><th>Perché</th><th>Azione</th></tr>'+trends.map(r=>'<tr><td><span class="pill '+(r.decision==="Priorita' alta"?'green':'')+'">'+h(r.decision)+'</span></td><td><b>'+h(r.idea)+'</b><br><span class="small">'+h(r.trigger)+'</span></td><td>'+h(r.target)+'</td><td>'+h(r.format)+'</td><td>'+h(r.palette)+'</td><td>'+h(r.why)+'</td><td>'+h(r.action)+'</td></tr>').join("")+'</table>'+
      '<h3>Angoli commerciali</h3><div class="grid3">'+[
        ["Gift nascita","Bundle premium, nome bambino, biglietto regalo, packaging curato."],
        ["Mamme","Cameretta calma, elegante, facile da applicare, non troppo cartoon."],
        ["Nonni","Prodotti semplici da capire: set regalo, tema dolce, valore emozionale."]
      ].map(x=>'<div class="action"><b>'+h(x[0])+'</b><br>'+h(x[1])+'</div>').join("")+'</div>';
    }

    BBUtils.el("growthBox").innerHTML='<div class="grid3">'+rs.map(r=>'<div class="action '+r[0]+'"><b>'+r[1]+'</b><br>'+r[2]+'</div>').join("")+'</div>'+
      (strategy.length?'<h3>Piano prodotto</h3><table class="decision-table"><tr><th>Decisione</th><th>Categoria</th><th>Azione</th><th>Vendite</th><th>Profitto</th><th>Segnali</th></tr>'+strategy.slice(0,12).map(r=>'<tr><td><span class="pill">'+h(r.decision)+'</span></td><td><b>'+h(r.category)+'</b></td><td>'+h(r.action)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(BBUtils.euro(r.profit))+'</td><td class="small">Store: '+h(r.visits||0)+' visite · Keyword: '+h(r.keywords||0)+'</td></tr>').join("")+'</table>':'');

    const decisionEl=BBUtils.el("decisionBox");
    if(decisionEl){
      const dr=BBAnalytics.decisionRows ? BBAnalytics.decisionRows(scopedSamples,s.counts) : [];
      const priorityPill=(r,i)=>'<span class="pill decision-'+(r.type==="red"?"fix":(r.type==="yellow"?"stock":"scale"))+'">'+(i+1)+'</span>';
      const itemCell=r=>["ASIN","Inventario"].includes(r.area)?this.asinCell(r.item,r.itemTitle):this.textCell(r.item,r.area);
      const section=(title,subtitle,rows)=>'<div class="decision-section"><h3>'+h(title)+'</h3><p class="hint">'+h(subtitle)+'</p>'+(rows.length?'<table class="decision-table"><tr><th>Priorità</th><th>Tipo</th><th>Cosa</th><th>Perché</th><th>Azione</th></tr>'+rows.map((r,i)=>'<tr><td>'+priorityPill(r,i)+'</td><td><span class="pill">'+h(r.area)+'</span></td><td><b>'+h(r.title)+'</b><br>'+itemCell(r)+'</td><td>'+h(r.why)+'</td><td>'+h(r.action)+'</td></tr>').join("")+'</table>':'<div class="action green">Nessuna urgenza in questa tipologia.</div>')+'</div>';
      const critical=dr.filter(r=>r.type==="red");
      const check=dr.filter(r=>r.type==="yellow" && r.area!=="Dati");
      const opportunity=dr.filter(r=>r.type==="green" && r.area!=="Sistema");
      const data=dr.filter(r=>r.area==="Dati" || r.area==="Sistema");
      decisionEl.innerHTML=dr.length?'<div class="grid3">'+[
        ["Da correggere",critical.length],
        ["Da controllare",check.length],
        ["Da spingere",opportunity.length],
        ["Dati / sistema",data.length]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      section("Da correggere subito","Problemi che bruciano margine: ASIN in perdita o keyword che spendono senza vendite.",critical)+
      section("Da controllare / ottimizzare","Situazioni da verificare prima di investire: stock, ACOS alto o dati da raffinare.",check)+
      section("Da spingere","Opportunità dove aumentare budget, proteggere ranking o dare priorità commerciale.",opportunity)+
      section("Dati e sistema","Report mancanti o messaggi di stato che aiutano a rendere le decisioni piu affidabili.",data):'<div class="action">Importa report per generare decisioni operative.</div>';
    }
    BBUtils.el("alertsBox").innerHTML=rs.map(r=>'<div class="action '+r[0]+'">🚨 <b>'+r[1]+'</b><br>'+r[2]+'</div>').join("");
    BBUtils.el("diagnosticBox").innerHTML='<div class="action"><b>SOLO TABELLE BB100 GROWTH ENGINE</b><br>Report files: '+s.files.length+'<br>Raw rows attive: '+totalRows+'<br>Report configurati: '+BBAnalytics.reportDefs.length+'<br>Storage: '+window.BIPBOP_CONFIG.storageKey+'</div>';
    BBUtils.el("errorBox").textContent=s.errors.length?s.errors.join("\\n"):"Nessun errore.";
  }
};
