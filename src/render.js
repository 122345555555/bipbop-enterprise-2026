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
  productCostInput(profileKey,field,value){
    return '<input class="cost-input" data-profile="'+BBUtils.html(profileKey)+'" data-field="'+BBUtils.html(field)+'" type="number" step="0.01" value="'+BBUtils.html(value||0)+'">';
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

    const execRecovery=BBAnalytics.salesRecovery ? BBAnalytics.salesRecovery(scopedSamples,c,s.counts) : null;
    const execDecisions=BBAnalytics.decisionRows ? BBAnalytics.decisionRows(scopedSamples,s.counts) : [];
    const execCompetitor=BBAnalytics.competitorSummary ? BBAnalytics.competitorSummary(scopedSamples,c) : null;
    const execCostSummary=BBAnalytics.productCostSummary ? BBAnalytics.productCostSummary(scopedSamples,c) : null;
    const execRules=BBUtils.rules();
    const manualSales=(execRules.manualSales||[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    const manualTotal=manualSales.reduce((a,r)=>a+BBUtils.num(r.amount),0);
    const manualUnits=manualSales.reduce((a,r)=>a+BBUtils.num(r.units),0);
    const manualToday=BBUtils.dateIT(BBUtils.todayISO());
    const localDate=s=>{
      if(!s) return null;
      const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null;
    };
    const manualLastDate=manualSales.length?localDate(manualSales[0].date):null;
    const reportLastDate=execRecovery?.lastSale?.date||null;
    const visibleLastSale=manualLastDate && (!reportLastDate || manualLastDate>reportLastDate)
      ? {date:manualLastDate,source:"manuale"}
      : (reportLastDate?{date:reportLastDate,source:"report"}:null);
    const daysSinceVisibleSale=visibleLastSale?Math.max(0,Math.round((new Date()-visibleLastSale.date)/86400000)):null;
    const salesStatus=daysSinceVisibleSale===null?"Dato mancante":(daysSinceVisibleSale<=2?"Vendite recenti":(daysSinceVisibleSale<=7?"Da monitorare":"Da riattivare"));
    const redCount=execDecisions.filter(r=>r.type==="red").length;
    const yellowCount=execDecisions.filter(r=>r.type==="yellow").length;
    const dataScore=BBAnalytics.reportDefs.length ? imported/BBAnalytics.reportDefs.length*100 : 0;
    const profitValue=Number.isFinite(c.reconciledProfit) ? c.reconciledProfit : c.profit;
    const profitScore=profitValue>0?100:(profitValue<0?25:50);
    const salesScore=daysSinceVisibleSale===null?45:(daysSinceVisibleSale<=2?100:(daysSinceVisibleSale<=7?70:(daysSinceVisibleSale<=14?40:15)));
    const adsScore=Number.isFinite(c.tacos)?(c.tacos<=execRules.tacos?100:(c.tacos<=execRules.tacos*2?60:25)):60;
    const marginValue=execCostSummary?.totals?.margin ?? c.margin;
    const marginScore=Number.isFinite(marginValue)?(marginValue>=execRules.margin?100:(marginValue>=0?55:20)):50;
    const competitorScore=Math.min(100,((execCompetitor?.rows?.length||0)/3)*100);
    const healthParts=[
      ["Dati",dataScore,20],
      ["Vendite",salesScore,20],
      ["Saldo",profitScore,20],
      ["Ads",adsScore,20],
      ["Margine",marginScore,15],
      ["Competitor",competitorScore,5]
    ];
    const health=Math.max(0,Math.min(100,Math.round(healthParts.reduce((a,r)=>a+(r[1]*r[2]/100),0))));
    const healthClass=health>=70?"green":(health>=45?"yellow":"red");
    const healthText=health>=70?"Da spingere":(health>=45?"Da controllare":"Da correggere");
    const firstDecision=execDecisions[0];
    const actionRows=execDecisions.slice(0,5);
    const missingCore=BBAnalytics.reportDefs.filter(r=>["business_report","transactions","ad_invoices","orders","inventory","search_terms","profit_report","store_date","store_live_page","store_source"].includes(r[0]) && !(s.counts[r[0]]||0));
    const targetPlan=[
      ["TACOS <= "+execRules.tacos+"%","Aumenta vendite organiche e riduci spesa Ads non produttiva.","Taglia keyword senza vendite, spingi solo campagne con ROAS buono, migliora schede prodotto e porta traffico verso Shopify."],
      ["ACOS <= "+execRules.acos+"%","Fai rendere meglio ogni euro pubblicitario.","Se una keyword spende e non vende, riduci offerta o mettila negativa. Se vende con ACOS basso, aumenta budget gradualmente."],
      ["Margine >= "+execRules.margin+"%","Alza margine per prodotto prima di aumentare volume.","Controlla costi produzione, imballo, spedizione e commissioni. Su prodotti sotto margine: prezzo, formato, bundle o stop Ads."],
      ["Saldo > 0 euro","Incrocia ricavi, Ads, canone, commissioni e costi interni.","Se il saldo resta basso, prima correggi costi e Ads; poi investi su prodotti con margine e domanda gia dimostrata."],
      ["Vendite recenti","Evita blocchi lunghi e intervieni presto.","Inserisci le vendite infrasettimanali o carica report aggiornati. Se non vendi da oltre 7 giorni, controlla offerta acquistabile, prezzo, consegna e traffico senza conversione."],
      ["Dati >= 80%","Ogni martedi carica i report chiave.","Business Report, Ordini, Profit Report, Ads, Search Terms, Inventario, Brand Analytics e Store. Senza dati l Executive ragiona a meta."],
      ["3-5 prodotti competitor","Trova prodotti da imitare senza copiare.","Per ogni prodotto competitor inserisci prezzo, rating, recensioni, venduti ultimo mese/BSR e idea variante BipBop."]
    ];

    BBUtils.el("healthScore").textContent=health;
    BBUtils.el("healthScore").className="circle "+healthClass;
    BBUtils.el("headline").textContent=imported?"Stato operativo: "+healthText:"Configura il cruscotto decisionale";
    BBUtils.el("subline").textContent=firstDecision?firstDecision.title+" — "+firstDecision.action:"Importa i report Amazon per vedere priorita', margine, vendite e prossime azioni.";
    BBUtils.el("kpis").innerHTML=[
      ["Stato operativo",health+"/100",healthClass,"Media di dati, vendite, saldo, Ads, margine"],
      ["Saldo stimato",c.sales?BBUtils.euro(profitValue):"—",profitValue<0?"red":"green","Obiettivo: sopra 0 euro"],
      ["Vendite",c.sales?BBUtils.euro(c.sales):"—","","Obiettivo: crescita settimanale"],
      ["Unita' vendute",c.units||"—","","Obiettivo: crescita stabile"],
      ["Vendite infrasett.",manualSales.length?BBUtils.euro(manualTotal):"—",manualTotal>0?"green":"","Inserite a mano: "+manualUnits+" unita"],
      ["Stato vendite",salesStatus,(daysSinceVisibleSale!==null&&daysSinceVisibleSale>7)?"red":(daysSinceVisibleSale!==null&&daysSinceVisibleSale<=2?"green":"yellow"),visibleLastSale?"Ultima: "+visibleLastSale.date.toLocaleDateString("it-IT")+" ("+visibleLastSale.source+")":"Inserisci vendita o carica report"],
      ["TACOS",BBUtils.pct(c.tacos),Number.isFinite(c.tacos)&&c.tacos>execRules.tacos?"red":"green","Target massimo: "+execRules.tacos+"%"],
      ["ACOS",BBUtils.pct(c.acos),Number.isFinite(c.acos)&&c.acos>execRules.acos?"red":"green","Target massimo: "+execRules.acos+"%"],
      ["Margine dopo costi",execCostSummary?.rows?.length?BBUtils.pct(execCostSummary.totals.margin):BBUtils.pct(c.margin),(execCostSummary?.totals?.margin||c.margin)<execRules.margin?"red":"green","Target minimo: "+execRules.margin+"%"],
      ["Completezza dati",Math.round(dataScore)+"%",dataScore>=80?"green":(dataScore>=50?"yellow":"red"),"Obiettivo: almeno 80%"],
      ["Competitor monitorati",execCompetitor?.rows?.length||0,"","Obiettivo: 3-5 prodotti competitor"]
    ].map(x=>'<div class="kpi '+(x[2]==="red"?'recon-bad':(x[2]==="green"?'recon-good':(x[2]==="yellow"?'stock-warn':'')))+'"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong><span>'+h(x[3]||"")+'</span></div>').join("");

    BBUtils.el("topActions").innerHTML='<div class="executive-status '+healthClass+'"><b>'+h(healthText)+'</b><span>'+h(health>=70?"La base e' utilizzabile: investi sulle opportunita' migliori, ma continua a controllare margini e competitor.":(health>=45?"Ci sono segnali buoni, ma prima di spingere devi risolvere le priorita' sotto.":"Serve mettere ordine: correggi i blocchi prima di aumentare budget o creare troppe varianti."))+'</span></div>'+
      '<div class="score-breakdown">'+healthParts.map(r=>'<div><small>'+h(r[0])+'</small><b>'+h(Math.round(r[1]))+'/100</b><span>Peso '+h(r[2])+'%</span></div>').join("")+'</div>'+
      (actionRows.length?'<table class="decision-table"><tr><th>Priorita</th><th>Area</th><th>Perche</th><th>Azione</th></tr>'+actionRows.map((r,i)=>'<tr><td><span class="pill '+(r.type==="red"?'red':(r.type==="green"?'green':''))+'">'+h(i+1)+'</span></td><td><b>'+h(r.title)+'</b><br><span class="small">'+h(r.area)+'</span></td><td>'+h(r.why)+'</td><td>'+h(r.action)+'</td></tr>').join("")+'</table>':'<div class="action green"><b>Nessuna urgenza critica</b><br>Continua con monitoraggio, caricamento report e test controllati.</div>');

    BBUtils.el("dataHealth").innerHTML='<div class="grid2 executive-mini">'+
      '<div class="action"><b>Prossima leva commerciale</b><br>'+h(execCompetitor?.own?"Spingi Shopify con bundle, gift nascita e varianti personalizzate.":"Inserisci bipbopstickers.it e almeno 3 competitor per capire dove differenziarti.")+'</div>'+
      '<div class="action"><b>Focus prodotto</b><br>'+h((BBAnalytics.productStrategyRows ? (BBAnalytics.productStrategyRows(scopedSamples)[0]?.category || "Carica dati Store e Profit Report per scegliere la categoria.") : "Carica dati Store e Profit Report.") )+'</div>'+
      '</div>'+
      '<div class="manual-sales-panel"><h3>Vendite infrasettimanali</h3><p class="hint">Inserisci qui le vendite viste durante la settimana. Restano separate dai report Amazon e servono solo per monitorare l andamento prima del prossimo caricamento.</p>'+
      '<div class="manual-sales-form"><div><label>Data</label><input id="manualSaleDate" inputmode="numeric" value="'+h(manualToday)+'" placeholder="gg/mm/aaaa"></div><div><label>ASIN</label><input id="manualSaleAsin" placeholder="B0..."></div><div><label>Descrizione</label><input id="manualSaleDescription" placeholder="Es. trenino, mongolfiere..."></div><div><label>Unita</label><input id="manualSaleUnits" type="number" min="1" step="1" value="1"></div><div><label>Vendite €</label><input id="manualSaleAmount" type="number" min="0" step="0.01" placeholder="19.90"></div><button id="saveManualSaleBtn" type="button">Aggiungi</button></div>'+
      '<div class="grid3 manual-sales-summary">'+[
        ["Totale inserito",manualSales.length?BBUtils.euro(manualTotal):"—"],
        ["Unita inserite",manualUnits||"—"],
        ["Righe manuali",manualSales.length||"—"]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      (manualSales.length?'<table class="compact-table manual-sales-table"><tr><th>Data</th><th>ASIN</th><th>Descrizione</th><th>Unita</th><th>Vendite</th><th>Azione</th></tr>'+manualSales.slice(0,12).map(r=>'<tr><td>'+h(BBUtils.dateIT(r.date))+'</td><td><b>'+h(r.asin||"—")+'</b></td><td>'+h(r.description||"—")+'</td><td>'+h(r.units||0)+'</td><td>'+h(BBUtils.euro(r.amount||0))+'</td><td><button class="secondaryBtn deleteManualSaleBtn" data-sale-id="'+h(r.id)+'" type="button">Elimina</button></td></tr>').join("")+'</table>':'<div class="action">Nessuna vendita manuale inserita.</div>')+
      '</div>'+
      '<h3>Come raggiungere i target</h3><div class="target-guide">'+targetPlan.map(r=>'<div class="target-card"><b>'+h(r[0])+'</b><span>'+h(r[1])+'</span><small>'+h(r[2])+'</small></div>').join("")+'</div>'+
      '<h3>Qualita dati</h3><div class="executive-data-grid">'+BBAnalytics.reportDefs.map(r=>{
        const ok=(s.counts[r[0]]||0)>0;
        return '<span class="data-chip '+(ok?'ok':(r[2]==="obbligatorio"?'bad':'warn'))+'">'+h(r[1])+'</span>';
      }).join("")+'</div>'+
      (missingCore.length?'<div class="action yellow"><b>Report da completare</b><br>'+h(missingCore.slice(0,6).map(r=>r[1]).join(", "))+(missingCore.length>6?"...":"")+'</div>':'<div class="action green"><b>Dati principali presenti</b><br>Ora la qualita dipende soprattutto da aggiornamento settimanale e deduplicazione.</div>');

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
        ["Stato vendite",rec.daysWithoutSales===null?"—":(rec.daysWithoutSales<=2?"Vendite recenti":(rec.daysWithoutSales<=7?"Da monitorare":"Da riattivare"))],
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

    const competitorEl=BBUtils.el("competitorBox");
    if(competitorEl){
      const comp=BBAnalytics.competitorSummary ? BBAnalytics.competitorSummary(scopedSamples,c) : {rows:[],opportunities:[]};
      const incompleteCompetitors=(comp.rows||[]).filter(r=>!r.isOwn && !r.totalPrice && !r.deliveryDays && !r.reviews && !r.rating && !r.bsr && !r.monthlySales && !r.strengths && !r.weaknesses && !r.notes);
      const linkFor=domain=>{
        const d=String(domain||"").trim();
        if(!d) return "";
        const url=/^https?:\/\//i.test(d)?d:"https://"+d;
        return '<a href="'+h(url)+'" target="_blank" rel="noopener">Apri</a>';
      };
      competitorEl.innerHTML='<div class="grid3">'+[
        ["Prodotti monitorati",comp.rows.length],
        ["Prezzo medio Amazon/BipBop",Number.isFinite(comp.avgAmazonPrice)?BBUtils.euro(comp.avgAmazonPrice):"—"],
        ["Prezzo medio competitor",Number.isFinite(comp.avgCompetitor)?BBUtils.euro(comp.avgCompetitor):"—"],
        ["Domanda piu alta",comp.bestDemand?comp.bestDemand.name:"—"],
        ["Consegna piu veloce",comp.fastest?comp.fastest.name:"—"],
        ["Canale Shopify",comp.own?comp.own.domain:"bipbopstickers.it"]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      '<h3>Aggiungi prodotto competitor</h3><p class="hint">Inserisci prodotti concorrenti Amazon o web. Se Amazon mostra “venduti nell’ultimo mese”, recensioni, rating o classifica Bestseller, inseriscili: l’app stima la domanda e ti dice se conviene creare un articolo simile.</p>'+
      '<div class="grid3">'+
        '<div><label>Prodotto / titolo</label><input id="competitorName" placeholder="Es. adesivo murale animali safari"></div>'+
        '<div><label>URL prodotto</label><input id="competitorDomain" placeholder="Link Amazon o sito competitor"></div>'+
        '<div><label>Canale</label><select id="competitorType"><option value="site">Sito competitor</option><option value="amazon">Amazon / Marketplace</option><option value="shopify">Shopify tuo</option><option value="marketplace">Altro marketplace</option></select></div>'+
        '<div><label>Tipologia prodotto</label><input id="competitorCategory" placeholder="Greche, adesivi, quadri, gift..."></div>'+
        '<div><label>Prezzo €</label><input id="competitorPrice" type="number" step="0.01" min="0" placeholder="19.90"></div>'+
        '<div><label>Spedizione €</label><input id="competitorShipping" type="number" step="0.01" min="0" placeholder="0"></div>'+
        '<div><label>Giorni consegna</label><input id="competitorDelivery" type="number" step="1" min="0" placeholder="2"></div>'+
        '<div><label>Recensioni</label><input id="competitorReviews" type="number" step="1" min="0" placeholder="125"></div>'+
        '<div><label>Rating</label><input id="competitorRating" type="number" step="0.1" min="0" max="5" placeholder="4.5"></div>'+
        '<div><label>BSR / classifica</label><input id="competitorBsr" type="number" step="1" min="0" placeholder="3500"></div>'+
        '<div><label>Venduti ultimo mese</label><input id="competitorMonthlySales" type="number" step="1" min="0" placeholder="100"></div>'+
        '<div><label>Punti forti prodotto</label><input id="competitorStrengths" placeholder="tema, colori, bundle, personalizzazione..."></div>'+
        '<div><label>Punti deboli / spazio BipBop</label><input id="competitorWeaknesses" placeholder="poche varianti, immagini deboli, non personalizzato..."></div>'+
      '</div>'+
      '<label>Idea articolo simile</label><textarea id="competitorNotes" placeholder="Che prodotto BipBop potremmo creare senza copiare? Es. variante tema safari salvia + nome bambino + bundle gift"></textarea>'+
      '<button id="saveCompetitorBtn">Salva prodotto competitor</button> <button id="clearCompetitorFormBtn" class="secondaryBtn" type="button">Pulisci</button>'+
      '<h3>Opportunita prodotti e mercato</h3>'+
      (comp.opportunities.length?'<div class="grid2">'+comp.opportunities.map(r=>'<div class="action"><b>'+h(r.title)+'</b><br>'+h(r.why)+'<br><span class="small">'+h(r.action)+'</span></div>').join("")+'</div>':'')+
      (incompleteCompetitors.length?'<div class="action yellow"><b>Risultato prodotto incompleto</b><br>Hai salvato '+h(incompleteCompetitors.map(r=>r.name).join(", "))+', ma mancano segnali domanda: prezzo, recensioni/rating, BSR o venduti nell ultimo mese. Finche restano vuoti, l’app non puo stimare se conviene creare un articolo simile.</div>':'')+
      '<div class="action yellow"><b>Nota pratica</b><br>I dati di vendita reali dei competitor non sono pubblici. Qui usiamo segnali osservabili: recensioni, rating, classifica Bestseller, badge venduti nell ultimo mese, prezzo e consegna. Non e una certezza, ma e molto utile per scegliere cosa testare.</div>'+
      '<h3>Prodotti competitor monitorati</h3>'+
      (comp.rows.length?'<table class="decision-table"><tr><th>Decisione</th><th>Prodotto</th><th>Tipo</th><th>Domanda stimata</th><th>Prezzo + sped.</th><th>Review / rating</th><th>BSR / venduti</th><th>Azione BipBop</th><th>Idea / note</th><th></th></tr>'+comp.rows.map(r=>'<tr><td><span class="pill '+(r.isOwn?'green':'')+'">'+h(r.decision)+'</span></td><td><b>'+h(r.name)+'</b><br><span class="small">'+h(r.domain||"—")+' '+linkFor(r.domain)+'</span></td><td>'+h(r.productType||r.category)+'</td><td><b>'+h(Math.round(r.demandScore||0))+'/100</b><br><span class="small">'+h(r.estimatedDemand||"—")+'</span></td><td>'+h(r.totalPrice?BBUtils.euro(r.totalPrice):"—")+'</td><td>'+h(r.reviews||"—")+' / '+h(r.rating||"—")+'</td><td>'+h(r.bsr||"—")+' / '+h(r.monthlySales||"—")+'</td><td>'+h(r.action)+'</td><td class="small">'+h([r.strengths,r.weaknesses,r.notes].filter(Boolean).join(" | ")||"—")+'</td><td><button class="secondaryBtn deleteCompetitorBtn" data-competitor-id="'+h(r.id)+'">Elimina</button></td></tr>').join("")+'</table>':'<div class="action">Inserisci almeno 3 prodotti competitor: uno best seller Amazon, uno sito esterno e uno prodotto gift/personalizzato.</div>');
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
      const baTop=ba.slice(0,25);
      const baOpportunity=ba.filter(r=>r.decision==="Grande opportunita").length;
      const baOptimize=ba.filter(r=>r.decision==="Ottimizza conversione").length;
      const baProtect=ba.filter(r=>r.decision==="Proteggi").length;
      const baVolume=ba.reduce((a,r)=>a+(r.volume||0),0);
      const avgBrandShare=ba.length?ba.reduce((a,r)=>a+(r.brandImpShare||0),0)/ba.length:NaN;
      const topDemand=ba.slice().sort((a,b)=>(b.volume||0)-(a.volume||0)).slice(0,5);
      const lowShare=ba.filter(r=>(r.volume||0)>=20 && (r.brandImpShare||0)<2).sort((a,b)=>(b.volume||0)-(a.volume||0)).slice(0,5);
      const clickNoBuy=ba.filter(r=>(r.clickTotal||0)>=10 && (r.purchaseShare||0)<5).sort((a,b)=>(b.clickTotal||0)-(a.clickTotal||0)).slice(0,5);
      const protectQueries=ba.filter(r=>(r.purchaseShare||0)>=20 || (r.purchaseBrand||0)>=2).sort((a,b)=>(b.purchaseShare||0)-(a.purchaseShare||0)).slice(0,5);
      const insightList=(title,subtitle,rows,metric)=>'<div class="ba-insight-card"><h3>'+h(title)+'</h3><p>'+h(subtitle)+'</p>'+(rows.length?'<ol>'+rows.map(r=>'<li><b>'+h(r.query)+'</b><span>'+h(metric(r))+'</span></li>').join("")+'</ol>':'<div class="small">Nessun dato critico in questo gruppo.</div>')+'</div>';
      const cls=d=>d==="Grande opportunita"?"decision-scale":d==="Ottimizza conversione"?"decision-optimize":d==="Proteggi"?"decision-protect":"decision-observe";
      baEl.innerHTML=ba.length?
      '<div class="ba-report-shell">'+
        '<div class="ba-report-head"><div><h2>Performance delle query di ricerca</h2><p>Vista in stile Amazon Brand Analytics: misura domanda, visibilita del marchio e passaggi del funnel dalla ricerca all acquisto.</p></div><div class="ba-market">Italia</div></div>'+
        '<div class="ba-tabs"><span class="active">Visualizzazione marchio</span><span>Visualizzazione ASIN</span></div>'+
        '<div class="ba-controls"><label>Marchio<select><option>Bip Bop stickers</option></select></label><label>Periodo interessato<select><option>Settimanale</option><option>Mensile</option></select></label><label>Settimana caricata<select><option>Ultimo report importato</option></select></label><button type="button">Applica</button><button type="button" class="secondaryBtn">Crea download</button></div>'+
        '<div class="grid3 ba-summary">'+[
          ["Query analizzate",ba.length],
          ["Volume query",baVolume],
          ["Quota media marchio",BBUtils.pct(avgBrandShare)],
          ["Opportunita",baOpportunity],
          ["Da ottimizzare",baOptimize],
          ["Da proteggere",baProtect]
        ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
        '<div class="action yellow"><b>Come leggere questa sezione</b><br>Brand Analytics non e uguale ai Search Terms pubblicitari: qui vedi la domanda generale Amazon. Se una query ha volume alto e quota BipBop bassa, e una possibile nuova linea prodotto, variante o campagna da testare.</div>'+
        '<h3>Dati interessanti da guardare prima</h3><div class="ba-insights">'+
          insightList("Domanda piu alta","Le ricerche piu grandi del mercato: servono per scegliere categorie e nuovi disegni.",topDemand,r=>"Volume "+(r.volume||0)+" · quota BipBop "+BBUtils.pct(r.brandImpShare))+
          insightList("Opportunita scoperte","Tanta domanda ma presenza BipBop bassa: qui puoi creare variante, listing o campagna.",lowShare,r=>"Volume "+(r.volume||0)+" · quota impression "+BBUtils.pct(r.brandImpShare))+
          insightList("Clic senza acquisti","Le persone cliccano, ma BipBop non chiude: controlla immagine, prezzo, promessa e prodotto.",clickNoBuy,r=>"Clic "+(r.clickTotal||0)+" · quota acquisti "+BBUtils.pct(r.purchaseShare))+
          insightList("Da proteggere","Query dove BipBop intercetta acquisti: evita di perderle e proteggi visibilita.",protectQueries,r=>"Quota acquisti "+BBUtils.pct(r.purchaseShare)+" · acquisti brand "+(r.purchaseBrand||0))+
        '</div>'+
        '<div class="ba-table-meta"><span>Visualizzazione 21 di 33 colonne</span><b>Personalizza colonne</b></div>'+
        '<div class="ba-table-wrap"><table class="ba-table"><tr class="ba-group-row"><th rowspan="2">Decisione</th><th rowspan="2">Query di ricerca</th><th rowspan="2">Cerca punteggio query</th><th rowspan="2">Volume query</th><th colspan="3">Funnel di ricerca - Impression</th><th colspan="4">Cerca funnel - Clic</th><th colspan="4">Cerca funnel - Aggiunte al carrello</th><th colspan="4">Cerca funnel - Acquisti</th><th rowspan="2">Azione BipBop</th></tr>'+
        '<tr class="ba-sub-row"><th>Conteggio totale</th><th>Conteggio marchio</th><th>% marchio</th><th>Conteggio totale</th><th>% clic</th><th>Conteggio marchio</th><th>% marchio</th><th>Conteggio totale</th><th>% carrello</th><th>Conteggio marchio</th><th>% marchio</th><th>Conteggio totale</th><th>% acquisto</th><th>Conteggio marchio</th><th>% marchio</th></tr>'+
        baTop.map(r=>'<tr><td><span class="pill '+cls(r.decision)+'">'+h(r.decision)+'</span></td><td><b>'+h(r.query)+'</b></td><td>'+h(r.rank||"—")+'</td><td>'+h(r.volume||"—")+'</td><td>'+h(r.impTotal||"—")+'</td><td>'+h(r.impBrand||"—")+'</td><td>'+h(BBUtils.pct(r.brandImpShare))+'</td><td>'+h(r.clickTotal||"—")+'</td><td>'+h(BBUtils.pct(r.clickRate))+'</td><td>'+h(r.clickBrand||"—")+'</td><td>'+h(BBUtils.pct(r.clickShare))+'</td><td>'+h(r.cartTotal||"—")+'</td><td>'+h(BBUtils.pct(r.cartRate))+'</td><td>'+h(r.cartBrand||"—")+'</td><td>'+h(BBUtils.pct(r.cartShare))+'</td><td>'+h(r.purchaseTotal||"—")+'</td><td>'+h(BBUtils.pct(r.purchaseRate))+'</td><td>'+h(r.purchaseBrand||"—")+'</td><td>'+h(BBUtils.pct(r.purchaseShare))+'</td><td class="small">'+h(r.action)+'</td></tr>').join("")+
        '</table></div><div class="ba-pagination">Pagina 1 di '+h(Math.max(1,Math.ceil(ba.length/25)))+' · Mostrate le prime 25 query ordinate per volume.</div>'+
      '</div>':'<div class="action">Importa Brand Analytics – Performance query di ricerca.</div>';
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

    const costSummary=BBAnalytics.productCostSummary ? BBAnalytics.productCostSummary(scopedSamples,c) : null;
    const costEl=BBUtils.el("productCostBox");
    if(costEl && costSummary){
      const profiles=costSummary.profiles;
      const profileRows=Object.keys(profiles).map(key=>({key,...profiles[key]}));
      costEl.innerHTML='<h3>Costi unitari per tipologia</h3><p class="hint">Valori per singolo ordine/unita. Inserisci ricavo/prezzo vendita, commissione Amazon, adesivo, inchiostro, imballo e spedizione. La commissione predefinita e 8%, ma puoi cambiarla per articoli sopra 20 euro.</p>'+
      '<table class="compact-table product-cost-table"><tr><th>Tipologia</th><th>Ricavo / prezzo vendita €</th><th>Commissione Amazon %</th><th>Adesivo €</th><th>Inchiostro €</th><th>Imballo €</th><th>Spedizione €</th><th>Totale costi €</th><th>Differenza ricavo-costi €</th></tr>'+
      profileRows.map(p=>{ const sale=BBUtils.num(p.salePrice); const commission=sale*BBUtils.num(p.amazonCommission)/100; const total=commission+BBUtils.num(p.adhesive)+BBUtils.num(p.ink)+BBUtils.num(p.packaging)+BBUtils.num(p.shipping); const diff=sale-total; return '<tr><td><b>'+h(p.label)+'</b></td><td>'+this.productCostInput(p.key,"salePrice",p.salePrice)+'</td><td>'+this.productCostInput(p.key,"amazonCommission",p.amazonCommission)+'</td><td>'+this.productCostInput(p.key,"adhesive",p.adhesive)+'</td><td>'+this.productCostInput(p.key,"ink",p.ink)+'</td><td>'+this.productCostInput(p.key,"packaging",p.packaging)+'</td><td>'+this.productCostInput(p.key,"shipping",p.shipping)+'</td><td><b>'+h(BBUtils.euro(total))+'</b><br><span class="small">Comm. '+h(BBUtils.euro(commission))+'</span></td><td class="'+(diff<0?'stock-bad':'status-ok')+'"><b>'+h(BBUtils.euro(diff))+'</b></td></tr>'; }).join("")+'</table>'+
      '<button id="saveProductCosts">Salva costi prodotto</button>'+
      '<h3>Margine simulato con costi interni</h3><div class="grid3">'+[
        ["Ricavi analizzati",BBUtils.euro(costSummary.totals.sales)],
        ["Ricavo simulato",BBUtils.euro(costSummary.totals.simulatedRevenue)],
        ["Unità",costSummary.totals.units||"—"],
        ["Adesivo",BBUtils.euro(costSummary.totals.adhesive)],
        ["Inchiostro",BBUtils.euro(costSummary.totals.ink)],
        ["Imballo",BBUtils.euro(costSummary.totals.packaging)],
        ["Spedizione",BBUtils.euro(costSummary.totals.shipping)],
        ["Commissione Amazon",BBUtils.euro(costSummary.totals.referral)],
        ["Ads allocati",BBUtils.euro(costSummary.totals.adsAllocated)],
        ["Totale costi",BBUtils.euro(costSummary.totals.totalCost)],
        ["Costo vendita medio",BBUtils.euro(costSummary.totals.costPerSale)],
        ["Netto simulato",BBUtils.euro(costSummary.totals.net)],
        ["Margine simulato",BBUtils.pct(costSummary.totals.margin)]
      ].map(x=>'<div class="kpi '+(x[0]==="Netto simulato"&&costSummary.totals.net<0?'recon-bad':'')+'"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      '<h3>Riepilogo per tipologia</h3>'+
      (costSummary.byProfile.length?'<table><tr><th>Tipologia</th><th>Prodotti</th><th>Ricavo</th><th>Unità</th><th>Costi interni</th><th>Commissione Amazon</th><th>Ads</th><th>Totale costi</th><th>Costo vendita medio</th><th>Netto</th><th>Margine</th></tr>'+costSummary.byProfile.map(r=>'<tr><td><b>'+h(r.profileLabel)+'</b></td><td>'+h(r.count)+'</td><td>'+h(BBUtils.euro(r.simulatedRevenue))+'</td><td>'+h(r.units)+'</td><td>'+h(BBUtils.euro(r.internal))+'</td><td>'+h(BBUtils.euro(r.referral))+'</td><td>'+h(BBUtils.euro(r.adsAllocated))+'</td><td>'+h(BBUtils.euro(r.totalCost))+'</td><td>'+h(BBUtils.euro(r.costPerSale))+'</td><td class="'+(r.net<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.net))+'</td><td>'+h(BBUtils.pct(r.marginAfterCosts))+'</td></tr>').join("")+'</table>':'<div class="action">Carica Profit Report o ordini per simulare i costi per tipologia.</div>')+
      '<h3>Dettaglio prodotti con margine simulato</h3>'+
      (costSummary.rows.length?'<table class="decision-table"><tr><th>Tipologia</th><th>ASIN / Prodotto</th><th>SKU</th><th>Ricavo</th><th>Unità</th><th>Adesivo</th><th>Inchiostro</th><th>Imballo</th><th>Spedizione</th><th>Comm.</th><th>Regola</th><th>Ads</th><th>Totale costi</th><th>Costo vendita</th><th>Netto</th><th>Margine</th></tr>'+costSummary.rows.map(r=>'<tr><td><span class="pill">'+h(r.profileLabel)+'</span></td><td>'+this.asinCell(r.asin,r.title)+'</td><td>'+h(r.sku)+'</td><td>'+h(BBUtils.euro(r.simulatedRevenue))+'</td><td>'+h(r.units)+'</td><td>'+h(BBUtils.euro(r.adhesive))+'</td><td>'+h(BBUtils.euro(r.ink))+'</td><td>'+h(BBUtils.euro(r.packaging))+'</td><td>'+h(BBUtils.euro(r.shipping))+'</td><td>'+h(BBUtils.euro(r.referral))+'</td><td>'+h(BBUtils.pct(r.referralRate))+'</td><td>'+h(BBUtils.euro(r.adsAllocated))+'</td><td>'+h(BBUtils.euro(r.totalCost))+'</td><td>'+h(BBUtils.euro(r.costPerSale))+'</td><td class="'+(r.net<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.net))+'</td><td>'+h(BBUtils.pct(r.marginAfterCosts))+'</td></tr>').join("")+'</table>':'<div class="action">Quando carichi il Profit Report, qui vedrai il margine per articolo considerando ricavo, commissione Amazon, adesivo, inchiostro, imballo e spedizione.</div>');
    }
    if(costSummary && costSummary.rows.length){
      BBUtils.el("profitBox").innerHTML += '<h3>Costi prodotto dettagliati</h3><div class="grid3">'+[
        ["Costi interni",BBUtils.euro(costSummary.totals.internal)],
        ["Commissioni stimate",BBUtils.euro(costSummary.totals.referral)],
        ["Netto simulato",BBUtils.euro(costSummary.totals.net)]
      ].map(x=>'<div class="kpi '+(x[0]==="Netto simulato"&&costSummary.totals.net<0?'recon-bad':'')+'"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><p class="hint">Questa simulazione usa i costi inseriti nella sezione Costi prodotto e li incrocia con ricavi, unità, Ads e commissioni stimate.</p>';
    }

    const fbaEl=BBUtils.el("fbaBox");
    if(fbaEl){
      const rules=BBUtils.rules();
      const fbaItems=(rules.fbaItems||[]).slice();
      const asinRows=BBAnalytics.asinDecisionRows ? BBAnalytics.asinDecisionRows(scopedSamples) : [];
      const fbaAsins=new Set(fbaItems.map(x=>String(x.asin||"").toUpperCase()));
      const candidates=asinRows.filter(r=>r.asin && r.asin!=="N/D" && !fbaAsins.has(String(r.asin).toUpperCase()) && (r.sales>0 || r.units>0)).sort((a,b)=>(b.units||0)-(a.units||0) || (b.sales||0)-(a.sales||0)).slice(0,8);
      const fbaSalePrice=r=>BBUtils.num(r.salePrice ?? r.unitCost);
      const fbaProductionCost=r=>BBUtils.num(r.productionCost);
      const productionTotal=fbaItems.reduce((a,r)=>a+(BBUtils.num(r.qty)*fbaProductionCost(r)),0);
      const inboundTotal=fbaItems.reduce((a,r)=>a+BBUtils.num(r.inboundCost),0);
      const amazonShippingTotal=fbaItems.reduce((a,r)=>a+(BBUtils.num(r.qty)*BBUtils.num(r.amazonShipCost)),0);
      const revenueTotal=fbaItems.reduce((a,r)=>a+(BBUtils.num(r.qty)*fbaSalePrice(r)),0);
      const totalFbaCost=productionTotal+inboundTotal+amazonShippingTotal;
      const netFba=revenueTotal-totalFbaCost;
      const qty=fbaItems.reduce((a,r)=>a+BBUtils.num(r.qty),0);
      const active=fbaItems.filter(r=>!["chiuso","stop"].includes(String(r.status||""))).length;
      const statusLabel=s=>({da_preparare:"Da preparare",inviato:"Inviato",ricevuto:"Ricevuto da Amazon",in_test:"In test",riordina:"Riordina",stop:"Stop",chiuso:"Chiuso"}[s]||s||"Da preparare");
      const statusClass=s=>["riordina","in_test","ricevuto"].includes(s)?"green":(s==="stop"?"red":"");
      fbaEl.innerHTML='<div class="grid3">'+[
        ["ASIN in test",fbaItems.length||"—"],
        ["Pezzi pianificati",qty||"—"],
        ["Ricavi vendita stimati",fbaItems.length?BBUtils.euro(revenueTotal):"—"],
        ["Produzione stimata",fbaItems.length?BBUtils.euro(productionTotal):"—"],
        ["Invio ad Amazon",fbaItems.length?BBUtils.euro(inboundTotal):"—"],
        ["Costo Amazon ordini",fbaItems.length?BBUtils.euro(amazonShippingTotal):"—"],
        ["Costo FBA stimato",fbaItems.length?BBUtils.euro(totalFbaCost):"—"],
        ["Netto test stimato",fbaItems.length?BBUtils.euro(netFba):"—"],
        ["Test attivi",active||"—"],
        ["Quantità consigliata","10 pz / ASIN"]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div>'+
      '<div class="action yellow"><b>Regola pratica</b><br>Usa FBA solo per ASIN gia validati: vendite reali, margine sostenibile, formato piccolo/leggero e rischio stock basso. Il primo test ideale e 3-5 ASIN con 10 pezzi ciascuno.</div>'+
      '<h3>Aggiungi ASIN FBA</h3><div class="fba-form">'+
        '<input id="fbaEditId" type="hidden">'+
        '<div><label>ASIN</label><input id="fbaAsin" placeholder="B0..."></div>'+
        '<div><label>Titolo / nota prodotto</label><input id="fbaTitle" placeholder="Mongolfiere, greca, animali..."></div>'+
        '<div><label>Pezzi</label><input id="fbaQty" type="number" min="1" value="10"></div>'+
        '<div><label>Prezzo vendita €/pz</label><input id="fbaSalePrice" type="number" min="0" step="0.01" placeholder="19.90"></div>'+
        '<div><label>Costo produzione €/pz</label><input id="fbaProductionCost" type="number" min="0" step="0.01" placeholder="0.00"></div>'+
        '<div><label>Costo invio Amazon €</label><input id="fbaInboundCost" type="number" min="0" step="0.01" placeholder="0.00"></div>'+
        '<div><label>Spedizione Amazon €/pz</label><input id="fbaAmazonShipCost" type="number" min="0" step="0.01" placeholder="0.00"></div>'+
        '<div><label>Data invio</label><input id="fbaSendDate" inputmode="numeric" placeholder="gg/mm/aaaa"></div>'+
        '<div><label>Stato</label><select id="fbaStatus"><option value="da_preparare">Da preparare</option><option value="inviato">Inviato</option><option value="ricevuto">Ricevuto da Amazon</option><option value="in_test">In test</option><option value="riordina">Riordina</option><option value="stop">Stop</option><option value="chiuso">Chiuso</option></select></div>'+
        '<div><label>Note</label><input id="fbaNotes" placeholder="Perche lo testo, dubbi, obiettivo..."></div>'+
        '<button id="saveFbaBtn" type="button">Salva ASIN FBA</button><button id="clearFbaFormBtn" class="secondaryBtn" type="button">Pulisci</button>'+
      '</div>'+
      '<h3>ASIN da gestire in FBA</h3>'+
      (fbaItems.length?'<table class="decision-table"><tr><th>Stato</th><th>ASIN / Prodotto</th><th>Pezzi</th><th>Prezzo vendita</th><th>Produzione/pezzo</th><th>Invio Amazon</th><th>Sped. Amazon/pezzo</th><th>Ricavo stimato</th><th>Costo totale stimato</th><th>Netto stimato</th><th>Data invio</th><th>Note</th><th>Azione</th></tr>'+fbaItems.map(r=>{ const q=BBUtils.num(r.qty); const sale=fbaSalePrice(r); const production=fbaProductionCost(r); const revenue=q*sale; const inv=(q*production)+BBUtils.num(r.inboundCost)+(q*BBUtils.num(r.amazonShipCost)); const net=revenue-inv; return '<tr><td><span class="pill '+statusClass(r.status)+'">'+h(statusLabel(r.status))+'</span></td><td>'+this.asinCell(r.asin,r.title)+'</td><td>'+h(r.qty||0)+'</td><td>'+h(BBUtils.euro(sale))+'</td><td>'+h(BBUtils.euro(production))+'</td><td>'+h(BBUtils.euro(r.inboundCost||0))+'</td><td>'+h(BBUtils.euro(r.amazonShipCost||0))+'</td><td>'+h(BBUtils.euro(revenue))+'</td><td><b>'+h(BBUtils.euro(inv))+'</b></td><td class="'+(net<0?'stock-bad':'status-ok')+'">'+h(BBUtils.euro(net))+'</td><td>'+h(BBUtils.dateIT(r.sendDate))+'</td><td class="small">'+h(r.notes||"—")+'</td><td><button class="secondaryBtn editFbaBtn" data-fba-id="'+h(r.id)+'" type="button">Modifica</button><button class="secondaryBtn deleteFbaBtn" data-fba-id="'+h(r.id)+'" type="button">Elimina</button></td></tr>'; }).join("")+'</table>':'<div class="action">Nessun ASIN FBA inserito. Parti da 3-5 prodotti gia venduti, 10 pezzi ciascuno.</div>')+
      '<div class="fba-print-area"><div class="fba-print-head"><div><h3>Lista reparto stampa</h3><p>ASIN scelti per test FBA. Stampare/preparare le quantità indicate.</p></div><button id="printFbaBtn" type="button">Stampa lista</button></div>'+
      (fbaItems.length?'<table class="compact-table"><tr><th>ASIN</th><th>Descrizione</th><th>Pezzi da stampare</th><th>Costo produzione/pezzo</th><th>Note</th></tr>'+fbaItems.map(r=>'<tr><td><b>'+h(r.asin||"—")+'</b></td><td>'+h(r.title||"—")+'</td><td><b>'+h(r.qty||0)+'</b></td><td>'+h(BBUtils.euro(fbaProductionCost(r)))+'</td><td>'+h(r.notes||"—")+'</td></tr>').join("")+'</table>':'<div class="action">Aggiungi ASIN FBA per creare la lista stampa.</div>')+'</div>'+
      '<h3>Candidati dai dati attuali</h3>'+
      (candidates.length?'<table class="decision-table"><tr><th>ASIN / Prodotto</th><th>Vendite</th><th>Unità</th><th>Profitto</th><th>Margine</th><th>Perché candidato</th><th></th></tr>'+candidates.map(r=>'<tr><td>'+this.asinCell(r.asin,r.title)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units||0)+'</td><td class="'+((r.profit||0)<0?'stock-bad':'')+'">'+h(BBUtils.euro(r.profit))+'</td><td>'+h(BBUtils.pct(r.margin))+'</td><td>'+h((r.units||0)>=5?"Ha gia vendite e unita: buono per test Prime/FBA.":"Ha venduto: valuta se leggero e con margine sufficiente.")+'</td><td><button class="secondaryBtn pickFbaCandidateBtn" data-asin="'+h(r.asin)+'" data-title="'+h(r.title||"")+'" type="button">Usa</button></td></tr>').join("")+'</table>':'<div class="action">Carica ordini o Profit Report per vedere candidati automatici.</div>');
    }

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
