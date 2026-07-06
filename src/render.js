window.BBRender = {
  state:null,
  setState(s){ this.state=s; },
  fileCount(type){ return this.state.files.filter(f=>f.report_type===type && !f.is_duplicate).length; },
  latest(type){ return this.state.files.find(f=>f.report_type===type); },
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
      ["Vendite",c.sales?BBUtils.euro(c.sales):"—"],["Unità",c.units||"—"],["Sessioni",c.sessions||"—"],["Conversione",BBUtils.pct(c.conversion)],["Commissioni Amazon",BBUtils.euro(c.amazonFees)],["Profitto stimato",c.sales?BBUtils.euro(c.profit):"—"]
    ].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>';

    BBUtils.el("adsBox").innerHTML='<div class="grid3">'+[
      ["Spesa Ads",c.ads?BBUtils.euro(c.ads):"—"],["Vendite Ads",c.adsSales?BBUtils.euro(c.adsSales):"—"],["ACOS",BBUtils.pct(c.acos)],["ROAS",Number.isFinite(c.roas)?c.roas.toFixed(2):"—"],["CPC",Number.isFinite(c.cpc)?BBUtils.euro(c.cpc):"—"],["CTR",BBUtils.pct(c.ctr)]
    ].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div>';
    const adFiles=s.files.filter(x=>["sponsored_products","sponsored_brands","sponsored_display"].includes(x.report_type)&&!x.is_duplicate);
    BBUtils.el("adsFilesBox").innerHTML=adFiles.length?'<h3>File Ads attivi</h3><table><tr><th>Tipo</th><th>File</th><th>Righe</th></tr>'+adFiles.map(f=>'<tr><td>'+h(BBAnalytics.label(f.report_type))+'</td><td>'+h(f.file_name)+'</td><td>'+h(f.row_count)+'</td></tr>').join("")+'</table>':'';

    const ar=BBAnalytics.asinRows(s.samples);
    BBUtils.el("asinBox").innerHTML=ar.length?'<table><tr><th>ASIN</th><th>Titolo</th><th>Vendite</th><th>Unità</th><th>Sessioni</th><th>Conv.</th></tr>'+ar.map(r=>'<tr><td>'+h(r.asin)+'</td><td>'+h(r.title)+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.units)+'</td><td>'+h(r.sessions)+'</td><td>'+h(r.cr?r.cr+"%":"—")+'</td></tr>').join("")+'</table>':'<div class="action">Importa Business Report o Transazioni.</div>';

    const ir=BBAnalytics.inventoryRows ? BBAnalytics.inventoryRows(s.samples) : [];
    const invEl=BBUtils.el("inventoryBox");
    if(invEl){
      invEl.innerHTML=ir.length?'<div class="grid3">'+[
        ["SKU attivi",ir.length],
        ["Quantità totale",ir.reduce((a,r)=>a+(r.quantity||0),0)],
        ["Valore listino",BBUtils.euro(ir.reduce((a,r)=>a+((r.price||0)*(r.quantity||0)),0))]
      ].map(x=>'<div class="kpi"><small>'+h(x[0])+'</small><strong>'+h(x[1])+'</strong></div>').join("")+'</div><table><tr><th>SKU</th><th>ASIN</th><th>Prodotto</th><th>Prezzo</th><th>Quantità</th><th>Stato</th><th>Canale</th></tr>'+ir.map(r=>'<tr><td>'+h(r.sku)+'</td><td>'+h(r.asin)+'</td><td>'+h(r.title)+'</td><td>'+h(BBUtils.euro(r.price))+'</td><td>'+h(r.quantity)+'</td><td>'+h(r.status)+'</td><td>'+h(r.channel)+'</td></tr>').join("")+'</table>':'<div class="action">Importa il Report di tutte le offerte per vedere SKU, ASIN, prezzo, quantità e stato.</div>';
    }

    const kr=BBAnalytics.keywordRows(s.samples);
    BBUtils.el("keywordBox").innerHTML=kr.length?'<table><tr><th>Keyword / Search Term</th><th>Spesa</th><th>Vendite</th><th>Click</th><th>ACOS</th><th>ROAS</th></tr>'+kr.map(r=>'<tr><td>'+h(r.term)+'</td><td>'+h(BBUtils.euro(r.spend))+'</td><td>'+h(BBUtils.euro(r.sales))+'</td><td>'+h(r.clicks)+'</td><td>'+h(BBUtils.pct(r.acos))+'</td><td>'+h(Number.isFinite(r.roas)?r.roas.toFixed(2):"—")+'</td></tr>').join("")+'</table>':'<div class="action">Importa Search Terms per vedere le keyword.</div>';

    
    const ba=BBAnalytics.brandAnalyticsRows ? BBAnalytics.brandAnalyticsRows(s.samples) : [];
    const baEl=BBUtils.el("brandAnalyticsBox");
    if(baEl){
      baEl.innerHTML=ba.length?'<table><tr><th>Query</th><th>Volume</th><th>Impression totali</th><th>Quota impression brand</th><th>Quota click brand</th><th>Quota acquisti brand</th></tr>'+ba.map(r=>'<tr><td>'+h(r.query)+'</td><td>'+h(r.volume)+'</td><td>'+h(r.impTotal)+'</td><td>'+h(BBUtils.pct(r.brandImpShare))+'</td><td>'+h(BBUtils.pct(r.clickShare))+'</td><td>'+h(BBUtils.pct(r.purchaseShare))+'</td></tr>').join("")+'</table>':'<div class="action">Importa Brand Analytics – Performance query di ricerca.</div>';
    }

    BBUtils.el("profitBox").innerHTML='<div class="grid3">'+[
      ["Ricavi",BBUtils.euro(c.sales)],["Commissioni Amazon",BBUtils.euro(c.amazonFees)],["Ads",BBUtils.euro(c.ads)],["Profitto stimato",BBUtils.euro(c.profit)],["Margine",BBUtils.pct(c.margin)],["TACOS",BBUtils.pct(c.tacos)]
    ].map(x=>'<div class="kpi"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("")+'</div><p class="hint">La sezione è AI-ready: i costi interni potranno essere collegati per arrivare al profitto netto reale.</p>';

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
