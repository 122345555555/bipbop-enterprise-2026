(function(){
"use strict";

const state={files:[],counts:{},samples:{},errors:[]};
BBRender.setState(state);

function show(view){
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active",s.id===view));
  const active=document.querySelector('.nav[data-view="'+view+'"]');
  if(active) BBUtils.el("pageTitle").textContent=active.textContent.replace(/[📊📥🧭💶📈📦📋🚚🛟🏬🕵️🔎🏷️💰🧾🗓️🎨🚀🧠🚨📁🧪⚙️]/g,"").trim();
}

async function importFiles(files){
  const lines=[];
  const forcedType=BBUtils.el("reportTypeOverride")?.value || "";
  for(const file of files){
    const safeFileName=BBUtils.html(file.name);
    try{
      const buffer=await file.arrayBuffer();
      const text=BBParser.decodeArrayBuffer(buffer);
      const parsed=BBParser.parse(text);
      const detectedType=BBParser.detectReport(parsed.headers,file.name);
      const reportType=forcedType || detectedType;
      if(reportType==="unknown"){
        lines.push("⚠️ "+safeFileName+": tipo report non riconosciuto. Colonne rilevate: "+parsed.headers.length+".");
        continue;
      }
      const fingerprint=await BBUtils.sha256(text);
      const source={
        ...BBParser.sourceFrom(reportType,file.name,parsed.headers),
        detected_type:detectedType,
        forced_type:forcedType || null,
        header_index:parsed.headerIndex
      };
      const result=await BBStorage.insertFile(reportType,file.name,parsed.headers,parsed.rows,fingerprint,source,parsed.delimiter);
      const placement=forcedType
        ? "forzato in "+BBUtils.html(BBAnalytics.label(reportType))+" (automatico: "+BBUtils.html(BBAnalytics.label(detectedType))+")"
        : "rilevato come "+BBUtils.html(BBAnalytics.label(reportType));
      if(result.isDuplicate){
        const existing=result.duplicateFile;
        const existingInfo=existing
          ? " Era già stato caricato come "+BBUtils.html(existing.file_name)+" ("+BBUtils.html(existing.row_count)+" righe)."
          : "";
        lines.push("ℹ️ "+safeFileName+": riconosciuto correttamente come "+BBUtils.html(BBAnalytics.label(reportType))+", ma è un duplicato."+existingInfo+" Non lo sommo di nuovo per evitare dati doppi.");
      }else{
        lines.push("✅ "+safeFileName+": "+placement+", "+parsed.rows.length+" righe, "+parsed.headers.length+" colonne, separatore "+BBUtils.html(parsed.delimiter==="\\t"?"TAB":parsed.delimiter)+".");
      }
    }catch(e){
      state.errors.push(String(e.message||e));
      lines.push("❌ "+safeFileName+": "+BBUtils.html(e.message||e));
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
  document.addEventListener("change",e=>{
    if(e.target && (e.target.id==="dataExplorerYear" || e.target.id==="dataExplorerMonth")) BBRender.renderAll();
  });
  document.addEventListener("click",e=>{
    if(e.target && e.target.id==="resetDataExplorerBtn"){
      const y=BBUtils.el("dataExplorerYear"), m=BBUtils.el("dataExplorerMonth");
      if(y) y.value=y.options[0]?.value || "all";
      if(m) m.value="all";
      BBRender.renderAll();
    }
  });
  BBUtils.el("refreshBtn").addEventListener("click",refresh);
  BBUtils.el("selectFilesBtn").addEventListener("click",()=>BBUtils.el("multiFile").click());
  BBUtils.el("multiFile").addEventListener("change",e=>importFiles(Array.from(e.target.files)));
  BBUtils.el("clearImportLogBtn").addEventListener("click",()=>BBUtils.el("importLog").textContent="Pronto.");
  BBUtils.el("archiveTable").addEventListener("click",async e=>{
    const btn=e.target.closest(".deleteFileBtn");
    if(!btn) return;
    const fileName=btn.dataset.fileName || "questo file";
    if(!confirm("Eliminare "+fileName+" dall'archivio e dai dati attivi?")) return;
    try{
      await BBStorage.deleteFile(btn.dataset.fileId);
      BBUtils.el("importLog").innerHTML="<div>✅ "+BBUtils.html(fileName)+": eliminato. Ora puoi ricaricarlo scegliendo la destinazione corretta.</div>";
      await refresh();
    }catch(err){
      state.errors.push(String(err.message||err));
      BBRender.renderAll();
    }
  });
  const fbaSamples=()=>BBRender.profitScopedSamples ? BBRender.profitScopedSamples(state) : state.samples;
  const fillFbaSuggestion=(force=false)=>{
    const asin=(BBUtils.el("fbaAsin")?.value || "").trim().toUpperCase();
    if(!asin || !BBAnalytics.fbaSuggestionForAsin) return null;
    const sug=BBAnalytics.fbaSuggestionForAsin(fbaSamples(),asin);
    if(!sug) return null;
    if(BBUtils.el("fbaTitle") && (force || !BBUtils.el("fbaTitle").value.trim())) BBUtils.el("fbaTitle").value=sug.title || "";
    if(BBUtils.el("fbaSalePrice") && (force || !BBUtils.num(BBUtils.el("fbaSalePrice").value))) BBUtils.el("fbaSalePrice").value=sug.salePrice ? sug.salePrice.toFixed(2) : "";
    if(BBUtils.el("fbaProductionCost") && (force || !BBUtils.num(BBUtils.el("fbaProductionCost").value))) BBUtils.el("fbaProductionCost").value=sug.productionCost ? sug.productionCost.toFixed(2) : "";
    if(BBUtils.el("fbaNotes") && !BBUtils.el("fbaNotes").value.trim()){
      const bits=[];
      if(sug.profileLabel) bits.push(sug.profileLabel);
      if(sug.units) bits.push(sug.units+" unita vendute");
      BBUtils.el("fbaNotes").value=bits.length?"Suggerito da report: "+bits.join(", "):"Suggerito da report";
    }
    return sug;
  };
  document.addEventListener("blur",e=>{
    if(e.target && e.target.id==="fbaAsin") fillFbaSuggestion(false);
  },true);
  document.addEventListener("input",e=>{
    if(e.target && e.target.id==="fbaAsin" && String(e.target.value||"").trim().length>=10) fillFbaSuggestion(false);
    if(e.target && e.target.id==="manualSaleAsin" && String(e.target.value||"").trim().length>=10){
      const desc=BBUtils.el("manualSaleDescription");
      if(desc && !desc.value.trim() && BBAnalytics.productTitleForAsin){
        const title=BBAnalytics.productTitleForAsin(fbaSamples(),String(e.target.value||"").trim().toUpperCase());
        if(title) desc.value=title;
      }
    }
  });
  document.addEventListener("click",e=>{
    const saveFba=e.target.closest("#saveFbaBtn");
    const clearFba=e.target.closest("#clearFbaFormBtn");
    const deleteFba=e.target.closest(".deleteFbaBtn");
    const editFba=e.target.closest(".editFbaBtn");
    const pickFba=e.target.closest(".pickFbaCandidateBtn");
    const fbaFormIds=["fbaEditId","fbaAsin","fbaTitle","fbaQty","fbaSalePrice","fbaProductionCost","fbaInboundCost","fbaAmazonShipCost","fbaSendDate","fbaStatus","fbaNotes"];
    const printFba=e.target.closest("#printFbaBtn");
    if(printFba){
      window.print();
      return;
    }
    if(pickFba){
      BBUtils.el("fbaEditId").value="";
      BBUtils.el("fbaAsin").value=pickFba.dataset.asin || "";
      BBUtils.el("fbaTitle").value=pickFba.dataset.title || "";
      BBUtils.el("fbaQty").value="10";
      if(BBUtils.el("fbaSalePrice")) BBUtils.el("fbaSalePrice").value=BBUtils.num(pickFba.dataset.salePrice)?BBUtils.num(pickFba.dataset.salePrice).toFixed(2):"";
      if(BBUtils.el("fbaProductionCost")) BBUtils.el("fbaProductionCost").value=BBUtils.num(pickFba.dataset.productionCost)?BBUtils.num(pickFba.dataset.productionCost).toFixed(2):"";
      fillFbaSuggestion(false);
      BBUtils.el("saveFbaBtn").textContent="Salva ASIN FBA";
      return;
    }
    if(clearFba){
      fbaFormIds.forEach(id=>{ const el=BBUtils.el(id); if(el) el.value=""; });
      if(BBUtils.el("fbaQty")) BBUtils.el("fbaQty").value="10";
      if(BBUtils.el("fbaStatus")) BBUtils.el("fbaStatus").value="da_preparare";
      if(BBUtils.el("saveFbaBtn")) BBUtils.el("saveFbaBtn").textContent="Salva ASIN FBA";
      return;
    }
    if(editFba){
      const rules=BBUtils.rules();
      const id=editFba.dataset.fbaId;
      const item=(rules.fbaItems||[]).find(x=>String(x.id)===String(id));
      if(!item) return;
      BBUtils.el("fbaEditId").value=item.id || "";
      BBUtils.el("fbaAsin").value=item.asin || "";
      BBUtils.el("fbaTitle").value=item.title || "";
      BBUtils.el("fbaQty").value=item.qty || 10;
      BBUtils.el("fbaSalePrice").value=item.salePrice ?? item.unitCost ?? 0;
      BBUtils.el("fbaProductionCost").value=item.productionCost || 0;
      BBUtils.el("fbaInboundCost").value=item.inboundCost || 0;
      BBUtils.el("fbaAmazonShipCost").value=item.amazonShipCost || 0;
      BBUtils.el("fbaSendDate").value=BBUtils.dateIT(item.sendDate || "");
      BBUtils.el("fbaStatus").value=item.status || "da_preparare";
      BBUtils.el("fbaNotes").value=item.notes || "";
      BBUtils.el("saveFbaBtn").textContent="Aggiorna ASIN FBA";
      BBUtils.el("fbaAsin").focus();
      return;
    }
    if(deleteFba){
      const rules=BBUtils.rules();
      const id=deleteFba.dataset.fbaId;
      const fbaItems=(rules.fbaItems||[]).filter(x=>String(x.id)!==String(id));
      localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,fbaItems}));
      BBRender.renderAll();
      return;
    }
    if(saveFba){
      const asin=(BBUtils.el("fbaAsin")?.value || "").trim().toUpperCase();
      if(!asin){
        alert("Inserisci l'ASIN da testare in FBA.");
        return;
      }
      const suggestion=fillFbaSuggestion(false);
      const rules=BBUtils.rules();
      const fbaItems=(rules.fbaItems||[]).slice();
      const editId=BBUtils.el("fbaEditId")?.value || "";
      const item={
        id:editId || "fba-"+Date.now().toString(36),
        asin,
        title:(BBUtils.el("fbaTitle")?.value || "").trim() || suggestion?.title || "",
        qty:BBUtils.num(BBUtils.el("fbaQty")?.value || 10),
        salePrice:BBUtils.num(BBUtils.el("fbaSalePrice")?.value) || BBUtils.num(suggestion?.salePrice),
        productionCost:BBUtils.num(BBUtils.el("fbaProductionCost")?.value) || BBUtils.num(suggestion?.productionCost),
        unitCost:BBUtils.num(BBUtils.el("fbaSalePrice")?.value) || BBUtils.num(suggestion?.salePrice),
        inboundCost:BBUtils.num(BBUtils.el("fbaInboundCost")?.value),
        amazonShipCost:BBUtils.num(BBUtils.el("fbaAmazonShipCost")?.value),
        sendDate:BBUtils.parseDate(BBUtils.el("fbaSendDate")?.value || ""),
        status:BBUtils.el("fbaStatus")?.value || "da_preparare",
        notes:(BBUtils.el("fbaNotes")?.value || "").trim(),
        createdAt:fbaItems.find(x=>String(x.id)===String(editId))?.createdAt || new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };
      const nextItems=editId ? fbaItems.map(x=>String(x.id)===String(editId)?item:x) : [item,...fbaItems].slice(0,100);
      localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,fbaItems:nextItems}));
      fbaFormIds.forEach(id=>{ const el=BBUtils.el(id); if(el) el.value=""; });
      if(BBUtils.el("fbaQty")) BBUtils.el("fbaQty").value="10";
      if(BBUtils.el("fbaStatus")) BBUtils.el("fbaStatus").value="da_preparare";
      if(BBUtils.el("saveFbaBtn")) BBUtils.el("saveFbaBtn").textContent="Salva ASIN FBA";
      BBRender.renderAll();
      return;
    }

    const saveManualSale=e.target.closest("#saveManualSaleBtn");
    const deleteManualSale=e.target.closest(".deleteManualSaleBtn");
    if(saveManualSale){
      const date=BBUtils.parseDate(BBUtils.el("manualSaleDate")?.value || BBUtils.todayISO());
      const asin=(BBUtils.el("manualSaleAsin")?.value || "").trim().toUpperCase();
      const description=(BBUtils.el("manualSaleDescription")?.value || "").trim() || (BBAnalytics.productTitleForAsin ? BBAnalytics.productTitleForAsin(fbaSamples(),asin) : "");
      const units=BBUtils.num(BBUtils.el("manualSaleUnits")?.value || 1);
      const amount=BBUtils.num(BBUtils.el("manualSaleAmount")?.value);
      if(!asin){
        alert("Inserisci l'ASIN della vendita.");
        return;
      }
      if(units<=0 || amount<=0){
        alert("Inserisci unita e importo vendita maggiori di zero.");
        return;
      }
      const rules=BBUtils.rules();
      const manualSales=(rules.manualSales||[]).slice();
      manualSales.unshift({id:"sale-"+Date.now().toString(36),date,asin,description,units,amount,createdAt:new Date().toISOString()});
      localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,manualSales:manualSales.slice(0,200)}));
      BBRender.renderAll();
      return;
    }
    if(deleteManualSale){
      const rules=BBUtils.rules();
      const id=deleteManualSale.dataset.saleId;
      const manualSales=(rules.manualSales||[]).filter(r=>String(r.id)!==String(id));
      localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,manualSales}));
      BBRender.renderAll();
      return;
    }

    if(!e.target.closest("#saveProductCosts")) return;
    const rules=BBUtils.rules();
    const productCosts={...rules.productCosts};
    document.querySelectorAll(".cost-input").forEach(input=>{
      const profile=input.dataset.profile;
      const field=input.dataset.field;
      if(!profile || !field) return;
      productCosts[profile]=productCosts[profile]||{};
      productCosts[profile][field]=BBUtils.num(input.value);
    });
    localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,productCosts}));
    alert("Costi prodotto salvati");
    BBRender.renderAll();
  });
  document.addEventListener("click",e=>{
    const saveBtn=e.target.closest("#saveCompetitorBtn");
    const clearBtn=e.target.closest("#clearCompetitorFormBtn");
    const deleteBtn=e.target.closest(".deleteCompetitorBtn");
    const formIds=["competitorName","competitorDomain","competitorCategory","competitorPrice","competitorShipping","competitorDelivery","competitorReviews","competitorRating","competitorBsr","competitorMonthlySales","competitorStrengths","competitorWeaknesses","competitorNotes"];
    if(clearBtn){
      formIds.forEach(id=>{ const el=BBUtils.el(id); if(el) el.value=""; });
      const type=BBUtils.el("competitorType");
      if(type) type.value="site";
      return;
    }
    if(deleteBtn){
      const rules=BBUtils.rules();
      const id=deleteBtn.dataset.competitorId;
      const competitors=(rules.competitors||[]).filter(c=>String(c.id)!==String(id));
      localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,competitors}));
      BBRender.renderAll();
      return;
    }
    if(!saveBtn) return;
    const name=BBUtils.el("competitorName")?.value.trim() || "";
    const domain=BBUtils.el("competitorDomain")?.value.trim() || "";
    if(!name && !domain){
      alert("Inserisci almeno nome o dominio del competitor.");
      return;
    }
    const rules=BBUtils.rules();
    const competitors=(rules.competitors||[]).slice();
    const entry={
      id:"comp-"+Date.now().toString(36),
      name:name || domain,
      domain,
      type:BBUtils.el("competitorType")?.value || "site",
      category:BBUtils.el("competitorCategory")?.value.trim() || "Generale",
      productType:BBUtils.el("competitorCategory")?.value.trim() || "Generale",
      price:BBUtils.num(BBUtils.el("competitorPrice")?.value),
      shipping:BBUtils.num(BBUtils.el("competitorShipping")?.value),
      deliveryDays:BBUtils.num(BBUtils.el("competitorDelivery")?.value),
      reviews:BBUtils.num(BBUtils.el("competitorReviews")?.value),
      rating:BBUtils.num(BBUtils.el("competitorRating")?.value),
      bsr:BBUtils.num(BBUtils.el("competitorBsr")?.value),
      monthlySales:BBUtils.num(BBUtils.el("competitorMonthlySales")?.value),
      strengths:BBUtils.el("competitorStrengths")?.value.trim() || "",
      weaknesses:BBUtils.el("competitorWeaknesses")?.value.trim() || "",
      notes:BBUtils.el("competitorNotes")?.value.trim() || "",
      updatedAt:new Date().toISOString()
    };
    localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,competitors:[entry,...competitors].slice(0,100)}));
    formIds.forEach(id=>{ const el=BBUtils.el(id); if(el) el.value=""; });
    const type=BBUtils.el("competitorType");
    if(type) type.value="site";
    BBRender.renderAll();
  });

  ["inventorySearch","inventoryFilter","inventoryLowStock","inventorySort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener(id==="inventorySearch"?"input":"change",()=>BBRender.renderAll());
  });
  BBUtils.el("inventoryReset")?.addEventListener("click",()=>{
    BBUtils.el("inventorySearch").value="";
    BBUtils.el("inventoryFilter").value="all";
    BBUtils.el("inventoryLowStock").value="10";
    BBUtils.el("inventorySort").value="title";
    BBRender.renderAll();
  });
  ["keywordSearch","keywordFilter","keywordMinClicks","keywordSort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener(id==="keywordSearch"?"input":"change",()=>BBRender.renderAll());
  });
  BBUtils.el("keywordReset")?.addEventListener("click",()=>{
    BBUtils.el("keywordSearch").value="";
    BBUtils.el("keywordFilter").value="all";
    BBUtils.el("keywordMinClicks").value="0";
    BBUtils.el("keywordSort").value="priority";
    BBRender.renderAll();
  });
  ["profitYearFilter","profitSort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener("change",()=>BBRender.renderAll());
  });
  BBUtils.el("profitReset")?.addEventListener("click",()=>{
    BBUtils.el("profitYearFilter").value="all";
    BBUtils.el("profitSort").value="sales_desc";
    BBRender.renderAll();
  });
  ["asinSearch","asinDecisionFilter","asinSort"].forEach(id=>{
    const el=BBUtils.el(id);
    if(el) el.addEventListener(id==="asinSearch"?"input":"change",()=>BBRender.renderAll());
  });
  BBUtils.el("asinReset")?.addEventListener("click",()=>{
    BBUtils.el("asinSearch").value="";
    BBUtils.el("asinDecisionFilter").value="all";
    BBUtils.el("asinSort").value="profit_desc";
    BBRender.renderAll();
  });

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
  BBUtils.el("ruleMonthlyFee").value=ru.monthlyFee;
  BBUtils.el("ruleSubscriptionMonths").value=ru.subscriptionMonths;
  BBUtils.el("ruleFulfillmentMode").value=ru.fulfillmentMode || "merchant";
  BBUtils.el("ruleHandlingDays").value=ru.handlingDays;
  BBUtils.el("ruleWeeklyProductionCapacity").value=ru.weeklyProductionCapacity;
  BBUtils.el("ruleProductionCost").value=ru.productionCostPerUnit;
  BBUtils.el("ruleShippingCost").value=ru.shippingCostPerUnit;
  BBUtils.el("ruleExtraFixedCosts").value=ru.extraFixedCosts;
  BBUtils.el("saveRules").addEventListener("click",()=>{
    const currentRules=BBUtils.rules();
    localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({
      ...currentRules,
      tacos:BBUtils.num(BBUtils.el("ruleTacos").value),
      acos:BBUtils.num(BBUtils.el("ruleAcos").value),
      margin:BBUtils.num(BBUtils.el("ruleMargin").value),
      monthlyFee:BBUtils.num(BBUtils.el("ruleMonthlyFee").value),
      subscriptionMonths:BBUtils.num(BBUtils.el("ruleSubscriptionMonths").value),
      fulfillmentMode:BBUtils.el("ruleFulfillmentMode").value,
      handlingDays:BBUtils.num(BBUtils.el("ruleHandlingDays").value),
      weeklyProductionCapacity:BBUtils.num(BBUtils.el("ruleWeeklyProductionCapacity").value),
      productionCostPerUnit:BBUtils.num(BBUtils.el("ruleProductionCost").value),
      shippingCostPerUnit:BBUtils.num(BBUtils.el("ruleShippingCost").value),
      extraFixedCosts:BBUtils.num(BBUtils.el("ruleExtraFixedCosts").value)
    }));
    alert("Regole salvate");
    BBRender.renderAll();
  });
}

document.addEventListener("DOMContentLoaded",()=>{bind();BBRender.renderAll();refresh();});
})();
