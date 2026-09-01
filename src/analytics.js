window.BBAnalytics = {
  reportDefs:[
    ["business_report","Business Report","obbligatorio"],
    ["transactions","Transazioni / Pagamenti","obbligatorio"],
    ["ad_invoices","Fatture Ads","obbligatorio"],
    ["sponsored_products","Sponsored Products","consigliato"],
    ["sponsored_brands","Sponsored Brands","consigliato"],
    ["sponsored_display","Sponsored Display","opzionale"],
    ["search_terms","Search Terms","consigliato"],
    ["orders","Report ordini","consigliato"],
    ["inventory","Inventario","consigliato"],
    ["store_date","Store - andamento date","consigliato"],
    ["store_live_page","Store - pagine attive","consigliato"],
    ["store_not_live_page","Store - pagine non attive","opzionale"],
    ["store_source","Store - fonti traffico","consigliato"],
    ["brand_analytics","Brand Analytics","consigliato"],
    ["profit_report","Profit Report","consigliato"]
  ],
  label(type){ const r=this.reportDefs.find(x=>x[0]===type); return r?r[1]:type; },
  rowYear(r){
    const raw=BBUtils.pick(r,["Data di inizio","Start Date","date-start","start-date","Data inizio"])||
      BBUtils.pick(r,["Data di fine","End Date","date-end","end-date","Data fine"]);
    const s=String(raw||"");
    const m=s.match(/(20\d{2})/);
    return m?m[1]:"Senza anno";
  },
  calc(samples){
    const br=samples.business_report||[], tx=samples.transactions||[], inv=samples.ad_invoices||[], profitRows=samples.profit_report||[];
    const storeDate=samples.store_date||[], storeLive=samples.store_live_page||[];
    const adsRows=[...(samples.sponsored_products||[]),...(samples.sponsored_brands||[]),...(samples.sponsored_display||[])];
    const orders=samples.orders||[];
    const rules=BBUtils.rules();
    const manualStatus=this.manualSalesStatus(samples,rules.manualSales||[]);

    const salesBR=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,[
      "Ordered Product Sales","Vendite di prodotti ordinati","Vendite prodotto ordinate",
      "Vendite dei prodotti ordinati","Sales","Vendite"
    ])),0);
    const salesTX=tx.reduce((a,r)=>{
      const products=BBUtils.num(BBUtils.pick(r,[
        "Totale costo prodotti","Product charges","Vendite prodotto","Product Sales"
      ]));
      const discounts=BBUtils.num(BBUtils.pick(r,["Totale sconti","Promotional rebates","Discounts"]));
      if(products || discounts) return a+Math.max(products+discounts,0);
      return a+Math.max(BBUtils.num(BBUtils.pick(r,["(totale) (EUR)","Totale (EUR)","Total (EUR)","Total","Totale"])),0);
    },0);
    const salesOrders=orders.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,[
      "item-price","Item Price","Prezzo articolo","Prezzo dell'articolo",
      "product-sales","Product Sales","Vendite prodotto","order-item-value"
    ])),0);
    const salesProfit=profitRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Vendite nette","Vendite","Net sales","Sales"])),0);
    const reportedSales=salesBR||salesTX||salesOrders||salesProfit;
    const sales=reportedSales+manualStatus.pendingTotal;

    const unitsProfit=profitRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Unità nette vendute","Unità vendute","Units sold","Net units sold"])),0);
    const unitsBusiness=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Units Ordered","Unità ordinate","Units","Quantità"])),0);
    /*
     * Il Business Report è il dato cumulativo ufficiale del periodo scelto
     * dall'utente. Il Report ordini resta la fonte granulare per il dettaglio
     * e per le metriche settimanali.
     */
    const orderTotals=orders.length?this.orderAnalysis({orders},{year:"all",month:"all"}).totals:null;
    const unitsOrders=orderTotals?orderTotals.units:0;
    const reportedUnits=unitsBusiness||unitsOrders||unitsProfit;
    const unitsSource=unitsBusiness?"Business Report":(orders.length?"Report ordini":(unitsProfit?"Profit Report":"Nessun report"));
    const units=reportedUnits+manualStatus.pendingUnits;
    const weekly=this.weeklySales(samples,manualStatus.pending);
    const sessions=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Sessions","Sessioni"])),0);
    const storeSales=storeDate.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Vendite","Sales"])),0) ||
      storeLive.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Vendite","Sales"])),0);
    const storeUnits=storeDate.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Unità","Units"])),0) ||
      storeLive.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Unità","Units"])),0);
    const storeOrders=storeDate.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Ordini","Orders"])),0) ||
      storeLive.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Ordini","Orders"])),0);
    const storeViews=storeDate.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Visualizzazioni","Views"])),0) ||
      storeLive.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Visualizzazioni","Views"])),0);
    const storeVisitors=storeDate.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Visitatori","Visite","Visitors","Visits"])),0) ||
      storeLive.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Visite","Visitatori","Visits","Visitors"])),0);
    const storeNewVisitors=storeDate.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Nuovi visitatori dello Store","New Store Visitors","Nuovi visitatori"])),0);

    const amazonFeesTX=tx.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Commissioni Amazon","Amazon fees","commissioni"])),0);
    const referralFeesProfit=profitRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Commissione per segnalazione: Totale","Referral fee: Total","Referral fees: Total"])),0);
    const amazonFeesProfit=profitRows.reduce((a,r)=>{
      const cols=Object.keys(r||{}).filter(k=>{
        const key=BBUtils.low(k);
        if(!key.startsWith("totale:")) return false;
        if(/ricavi netti|net revenue|vendite nette|net sales/.test(key)) return false;
        if(/sponsored|pubblicitari|advertising/.test(key)) return false;
        return true;
      });
      return a+cols.reduce((s,k)=>{
        const key=BBUtils.low(k);
        const amount=Math.abs(BBUtils.num(r[k]));
        const isCredit=(/rimborsi delle commissioni|referral fee refund|rimborso inventario|inventory reimbursement/.test(key))&&!/trattenuta|retained/.test(key);
        return s+(isCredit?-amount:amount);
      },0);
    },0);
    const amazonFees=amazonFeesTX || -amazonFeesProfit;
    const adsInvoice=inv.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Importo pagato (convertito)","Paid Amount","Amount Paid","Totale","Total","Importo"])),0);
    const adsSpend=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Spend","Spesa","Cost","Costo","Costo totale"])),0);
    const adsProfitReport=profitRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,[
      "Costo pubblicitario delle vendite: Totale",
      "Addebiti Sponsored Products: Totale",
      "Advertising cost of sales: Total",
      "Sponsored Products charges: Total",
      "Sponsored Products charges"
    ])),0);
    const adsSales=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Sales","Vendite","7 Day Total Sales","14 Day Total Sales"])),0);
    const clicks=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Clicks","Clic","Click"])),0);
    const impressions=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Impressions","Impressioni","Viewable impressions","Impressioni visualizzabili"])),0);
    const ads=adsInvoice||adsSpend;
    const netProfitReport=profitRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Totale: Ricavi netti","Ricavi netti","Utile netto","Profitto netto","Net profit","Profit"])),0);
    const profit=netProfitReport || (sales+amazonFees-ads);
    const subscriptionCost=BBUtils.num(rules.monthlyFee)*BBUtils.num(rules.subscriptionMonths);
    const productionCost=BBUtils.num(rules.productionCostPerUnit)*units;
    const shippingCost=BBUtils.num(rules.shippingCostPerUnit)*units;
    const extraFixedCosts=BBUtils.num(rules.extraFixedCosts);
    const adsExtra=netProfitReport ? Math.max(ads-adsProfitReport,0) : ads;
    const reconciledProfit=(netProfitReport||profit)-adsExtra-subscriptionCost;
    const conservativeProfit=(netProfitReport||profit)-ads-subscriptionCost;
    const avgPrice=units?sales/units:NaN;
    const manualBalance=sales-referralFeesProfit-ads-subscriptionCost-productionCost-shippingCost-extraFixedCosts;

    return {
      sales,reportedSales,salesBR,salesTX,salesOrders,salesProfit,units,reportedUnits,unitsBusiness,unitsOrders,unitsProfit,unitsSource,avgPrice,sessions,storeSales,storeUnits,storeOrders,storeViews,storeVisitors,storeNewVisitors,amazonFees,amazonFeesTX,amazonFeesProfit,referralFeesProfit,ads,adsInvoice,adsSpend,adsProfitReport,adsExtra,adsSales,clicks,impressions,profit,netProfitReport,subscriptionCost,productionCost,shippingCost,extraFixedCosts,reconciledProfit,conservativeProfit,manualBalance,
      manualPendingSales:manualStatus.pendingTotal,
      manualPendingUnits:manualStatus.pendingUnits,
      manualCoveredSales:manualStatus.coveredTotal,
      manualCoveredUnits:manualStatus.coveredUnits,
      manualPendingRows:manualStatus.pending.length,
      manualCoveredRows:manualStatus.covered.length,
      manualCutoffDate:manualStatus.cutoff,
      weeklySales:weekly.sales,
      weeklyUnits:weekly.units,
      weeklyLabel:weekly.label,
      weeklyHasData:weekly.hasData,
      weeklyStart:weekly.start,
      weeklyEnd:weekly.end,
      storeSalesShare:sales&&storeSales?storeSales/sales*100:NaN,
      storeConversion:storeVisitors&&storeOrders?storeOrders/storeVisitors*100:NaN,
      storeSalesPerVisitor:storeVisitors?storeSales/storeVisitors:NaN,
      tacos:sales?ads/sales*100:NaN,
      acos:adsSales?ads/adsSales*100:NaN,
      roas:ads?adsSales/ads:NaN,
      ctr:impressions?clicks/impressions*100:NaN,
      cpc:clicks?ads/clicks:NaN,
      margin:sales?profit/sales*100:NaN,
      conversion:sessions?units/sessions*100:NaN
    };
  },
  recommendations(c,counts){
    const r=BBUtils.rules(), out=[];
    if(!counts.business_report) out.push(["red","Importa Business Report","Serve per sessioni, conversione e vendite per ASIN."]);
    if(!counts.transactions) out.push(["red","Importa Transazioni","Serve per commissioni Amazon e movimenti reali."]);
    if(!counts.ad_invoices) out.push(["yellow","Importa Fatture Ads","Serve per la spesa pubblicitaria reale fatturata."]);
    if(!counts.store_date && !counts.store_live_page) out.push(["yellow","Importa Store Amazon","Serve per capire se conviene spingere greche, quadri, adesivi o nuove varianti."]);
    if(Number.isFinite(c.tacos)&&c.tacos>r.tacos) out.push(["red","TACOS alto","TACOS "+BBUtils.pct(c.tacos)+" sopra target "+r.tacos+"%."]);
    if(Number.isFinite(c.acos)&&c.acos>r.acos) out.push(["red","ACOS alto","ACOS "+BBUtils.pct(c.acos)+" sopra target "+r.acos+"%."]);
    if(Number.isFinite(c.ctr)&&c.ctr<0.25) out.push(["yellow","CTR basso","CTR "+BBUtils.pct(c.ctr)+": controlla immagine, titolo e pertinenza keyword."]);
    if(Number.isFinite(c.margin)&&c.margin<r.margin) out.push(["yellow","Margine basso","Margine "+BBUtils.pct(c.margin)+" sotto target "+r.margin+"%."]);
    if(!out.length) out.push(["green","Base dati buona","Puoi iniziare l’ottimizzazione operativa."]);
    return out;
  },
  asinRows(samples){
    const br=samples.business_report||[], tx=samples.transactions||[], orders=samples.orders||[], profitRows=samples.profit_report||[], map=new Map();
    br.forEach(r=>{
      const asin=BBUtils.pick(r,["ASIN","Parent ASIN","Child ASIN"])||"N/D";
      const title=BBUtils.pick(r,["Title","Titolo","Product Name","Nome prodotto"])||"";
      const o=map.get(asin)||{asin,title,sales:0,units:0,sessions:0,cr:0};
      o.sales+=BBUtils.num(BBUtils.pick(r,[
        "Ordered Product Sales","Vendite di prodotti ordinati","Sales","Vendite prodotto ordinate","Vendite"
      ]));
      o.units+=BBUtils.num(BBUtils.pick(r,["Units Ordered","Unità ordinate","Units","Quantità"]));
      o.sessions+=BBUtils.num(BBUtils.pick(r,["Sessions","Sessioni"]));
      o.cr=Math.max(o.cr,BBUtils.num(BBUtils.pick(r,["Unit Session Percentage","Conversion Rate","Tasso conversione"])));
      map.set(asin,o);
    });
    tx.forEach(r=>{
      const d=BBUtils.pick(r,["Dettagli prodotto","Product Details","Title"])||"";
      const m=String(d).match(/B0[A-Z0-9]{8}/);
      const asin=m?m[0]:"N/D";
      const o=map.get(asin)||{asin,title:d,sales:0,units:0,sessions:0,cr:0};
      o.sales+=Math.max(BBUtils.num(BBUtils.pick(r,[
        "Totale costo prodotti","Product charges","(totale) (EUR)","Totale (EUR)","Total (EUR)","Totale"
      ])),0);
      map.set(asin,o);
    });
    orders.forEach(r=>{
      const asin=BBUtils.pick(r,["asin","ASIN","product-id","Product ID"])||"N/D";
      const title=BBUtils.pick(r,["product-name","Product Name","item-name","Titolo","Title"])||"";
      const o=map.get(asin)||{asin,title,sales:0,units:0,sessions:0,cr:0};
      o.title=o.title||title;
      o.sales+=BBUtils.num(BBUtils.pick(r,[
        "item-price","Item Price","Prezzo articolo","Prezzo dell'articolo",
        "product-sales","Product Sales","Vendite prodotto","order-item-value"
      ]));
      o.units+=BBUtils.num(BBUtils.pick(r,["quantity-purchased","Quantity","Quantità","quantity"]));
      map.set(asin,o);
    });
    profitRows.forEach(r=>{
      const asin=BBUtils.pick(r,["ASIN","asin"])||"N/D";
      const title=BBUtils.pick(r,["MSKU","sku","SKU"])||"";
      const o=map.get(asin)||{asin,title,sales:0,units:0,sessions:0,cr:0};
      o.title=o.title||title;
      o.sales+=BBUtils.num(BBUtils.pick(r,["Vendite nette","Vendite","Net sales","Sales"]));
      o.units+=BBUtils.num(BBUtils.pick(r,["Unità nette vendute","Unità vendute","Units sold","Net units sold"]));
      o.netProfit=(o.netProfit||0)+BBUtils.num(BBUtils.pick(r,["Totale: Ricavi netti","Ricavi netti","Utile netto","Profitto netto","Net profit","Profit"]));
      map.set(asin,o);
    });
    return Array.from(map.values()).sort((a,b)=>b.sales-a.sales).slice(0,100);
  },
  productTitleMap(samples){
    const map=new Map();
    const remember=(asin,title)=>{
      asin=String(asin||"").trim();
      title=String(title||"").replace(/\s+/g," ").trim();
      if(!asin || asin==="N/D" || !title || map.has(asin)) return;
      map.set(asin,BBUtils.short(title,140));
    };
    (samples.inventory||[]).forEach(r=>{
      remember(
        BBUtils.pick(r,["asin1","ASIN","asin","product-id"]),
        BBUtils.pick(r,["item-name","Title","Titolo","Product Name","Nome prodotto"])
      );
    });
    (samples.orders||[]).forEach(r=>{
      remember(
        BBUtils.pick(r,["asin","ASIN","product-id","Product ID"]),
        BBUtils.pick(r,["product-name","Product Name","item-name","Titolo","Title"])
      );
    });
    (samples.business_report||[]).forEach(r=>{
      remember(
        BBUtils.pick(r,["ASIN","Parent ASIN","Child ASIN"]),
        BBUtils.pick(r,["Title","Titolo","Product Name","Nome prodotto"])
      );
    });
    (samples.profit_report||[]).forEach(r=>{
      remember(
        BBUtils.pick(r,["ASIN","asin"]),
        BBUtils.pick(r,["Titolo","Title","Product Name","Nome prodotto","Nome articolo","Item Name","MSKU","sku","SKU"])
      );
    });
    (samples.store_live_page||[]).forEach(r=>{
      remember(
        BBUtils.pick(r,["ASIN","asin","product-id","Product ID"]),
        BBUtils.pick(r,["Titolo","Title","Product Name","Nome prodotto","Pagina Store","Page"])
      );
    });
    return map;
  },
  productTitleForAsin(samples,asin){
    const key=String(asin||"").trim().toUpperCase();
    if(!key) return "";
    const titles=this.productTitleMap(samples);
    return titles.get(key) || titles.get(String(asin||"").trim()) || "";
  },
  keywordRows(samples){
    const rows=(samples.search_terms||[]).map(r=>({row:r,source:"Search Terms"}));
    const map=new Map();
    rows.forEach(item=>{
      const r=item.row;
      const term=BBUtils.pick(r,[
        "Customer Search Term","Termine di ricerca del cliente","Search Term",
        "Termine di ricerca","Termine ricerca","Keyword","Parole chiave","Parola chiave"
      ])||"";
      const key=BBUtils.low(term);
      const words=String(term||"").trim().split(/\s+/).filter(Boolean).length;
      if(/^\d+$/.test(key) || words<2) return;
      if(!key || key==="*") return;
      const o=map.get(key)||{
        term:BBUtils.short(term,90),
        rawTerm:term,
        source:new Set(),
        spend:0,
        sales:0,
        clicks:0,
        impressions:0,
        orders:0,
        units:0,
        periods:new Set()
      };
      o.source.add(item.source);
      if(r.__period_key) o.periods.add(r.__period_key);
      o.spend+=BBUtils.num(BBUtils.pick(r,["Spend","Spesa","Cost","Costo","Costo totale"]));
      o.sales+=BBUtils.num(BBUtils.pick(r,["Sales","Vendite","7 Day Total Sales","14 Day Total Sales","7 Day Total Sales (€)"]));
      o.clicks+=BBUtils.num(BBUtils.pick(r,["Clicks","Clic","Click"]));
      o.impressions+=BBUtils.num(BBUtils.pick(r,["Impressions","Impressioni","Viewable impressions","Impressioni visualizzabili"]));
      o.orders+=BBUtils.num(BBUtils.pick(r,["Orders","Ordini","7 Day Total Orders","14 Day Total Orders","Purchases","Acquisti"]));
      o.units+=BBUtils.num(BBUtils.pick(r,["Units","Unità","7 Day Total Units","14 Day Total Units"]));
      map.set(key,o);
    });
    return Array.from(map.values()).map(o=>{
      const acos=o.sales?o.spend/o.sales*100:NaN;
      const roas=o.spend?o.sales/o.spend:NaN;
      const ctr=o.impressions?o.clicks/o.impressions*100:NaN;
      const cpc=o.clicks?o.spend/o.clicks:NaN;
      const cvr=o.clicks?(o.orders||o.units)/o.clicks*100:NaN;
      let decision="observe", action="Osserva";
      if(o.sales>0 && Number.isFinite(acos) && acos<=25 && o.clicks>=3){
        decision="scale"; action="Aumenta budget / offerta";
      }else if(o.sales>0 && Number.isFinite(acos) && acos<=40){
        decision="protect"; action="Mantieni e proteggi";
      }else if(o.sales>0){
        decision="optimize"; action="Riduci offerta o migliora scheda";
      }else if(o.spend>=10 || o.clicks>=15){
        decision="cut"; action="Taglia o metti negativa";
      }else if(o.clicks>=3 || o.impressions>=500){
        decision="test"; action="Continua test con budget controllato";
      }
      const priority={scale:1,cut:2,optimize:3,protect:4,test:5,observe:6}[decision]||9;
      return {
        term:o.term,
        source:Array.from(o.source).join(", "),
        spend:o.spend,
        sales:o.sales,
        clicks:o.clicks,
        impressions:o.impressions,
        orders:o.orders,
        units:o.units,
        periods:o.periods.size,
        acos,
        roas,
        ctr,
        cpc,
        cvr,
        decision,
        action,
        priority,
        search:[o.rawTerm,Array.from(o.source).join(" ")].join(" ").toLowerCase()
      };
    }).sort((a,b)=>a.priority-b.priority || b.sales-a.sales || b.spend-a.spend).slice(0,500);
  }
,
  keywordCoverage(samples){
    const rows=samples.search_terms||[];
    const periods=Array.from(new Set(rows.map(r=>r.__period_key).filter(Boolean))).sort();
    return {
      periods:periods.length,
      first:periods[0]||"",
      last:periods[periods.length-1]||"",
      rows:rows.length
    };
  },
  storeMetricRows(rows,labelKey,kind){
    return (rows||[]).map(r=>{
      const name=BBUtils.pick(r,[labelKey,"Fonte","Pagine attive","Altre pagine","Data"])||"";
      const sales=BBUtils.num(BBUtils.pick(r,["Vendite","Sales"]));
      const units=BBUtils.num(BBUtils.pick(r,["Unità","Units"]));
      const orders=BBUtils.num(BBUtils.pick(r,["Ordini","Orders"]));
      const views=BBUtils.num(BBUtils.pick(r,["Visualizzazioni","Views"]));
      const visits=BBUtils.num(BBUtils.pick(r,["Visite","Visitatori","Visits","Visitors"]));
      const stay=BBUtils.num(BBUtils.pick(r,["Tempo medio di permanenza","Average Dwell Time"]));
      const bounce=BBUtils.num(BBUtils.pick(r,["Frequenza media di rimbalzo","Bounce Rate"]));
      const salesPerVisit=visits?sales/visits:NaN;
      const orderRate=visits?orders/visits*100:NaN;
      return {kind,name,sales,units,orders,views,visits,stay,bounce,salesPerVisit,orderRate,search:String(name||"").toLowerCase()};
    }).filter(r=>r.name).sort((a,b)=>b.sales-a.sales || b.visits-a.visits);
  },
  categoryForText(text){
    const t=BBUtils.low(text);
    if(t.includes("grech")) return "Greche murali";
    if(t.includes("mongolfier") || t.includes("aerei") || t.includes("viaggio")) return "Mongolfiere / viaggio";
    if(t.includes("quadri")) return "Quadri cameretta";
    if(t.includes("animali")) return "Animali";
    if(t.includes("stelle") || t.includes("luna") || t.includes("sogni")) return "Stelle / luna";
    if(t.includes("dinosauri") || t.includes("dinosauro")) return "Dinosauri";
    if(t.includes("unicorno") || t.includes("fate") || t.includes("principess")) return "Fiaba / unicorni";
    if(t.includes("natali")) return "Natale";
    if(t.includes("bordo") || t.includes("greca")) return "Greche murali";
    return "Adesivi murali";
  },
  costProfileKey(text){
    const t=BBUtils.low(text);
    if(t.includes("bundle") || t.includes("set premium") || t.includes("kit")) return "bundle";
    if(t.includes("quadro") || t.includes("quadri") || t.includes("poster") || t.includes("stampa")) return "quadri";
    if(t.includes("grech") || t.includes("bordo")) return "greche";
    if(t.includes("adesiv") || t.includes("stickers") || t.includes("murali")) return "adesivi";
    return "altro";
  },
  normalizeCostProfile(profile,fallbackProduction=0,fallbackShipping=0){
    const p=profile || {};
    const adhesiveSource=Object.prototype.hasOwnProperty.call(p,"adhesive") ? p.adhesive : (p.production || fallbackProduction);
    return {
      label:p.label || "Altro",
      salePrice:BBUtils.num(p.salePrice),
      amazonCommission:BBUtils.num(Object.prototype.hasOwnProperty.call(p,"amazonCommission") ? p.amazonCommission : 8),
      adhesive:BBUtils.num(adhesiveSource),
      ink:BBUtils.num(p.ink),
      packaging:BBUtils.num(p.packaging),
      shipping:BBUtils.num(p.shipping || fallbackShipping)
    };
  },
  costProfiles(){
    const rules=BBUtils.rules();
    const defaults=BBUtils.rules().productCosts || {};
    return {
      greche:this.normalizeCostProfile({label:"Greche murali",...defaults.greche}),
      adesivi:this.normalizeCostProfile({label:"Adesivi murali",...defaults.adesivi}),
      quadri:this.normalizeCostProfile({label:"Quadri",...defaults.quadri}),
      bundle:this.normalizeCostProfile({label:"Bundle / set premium",...defaults.bundle}),
      altro:this.normalizeCostProfile({label:"Altro",...defaults.altro},rules.productionCostPerUnit||0,rules.shippingCostPerUnit||0)
    };
  },
  amazonReferralRate(row){
    const avgPrice=(row.units||0)?(row.sales||0)/(row.units||1):(row.sales||0);
    const changeDate=new Date(2026,0,15);
    if(row.latestDate instanceof Date && !Number.isNaN(row.latestDate.getTime())){
      return row.latestDate>=changeDate && avgPrice<20 ? 8 : 15;
    }
    if(String(row.year)==="2026" && avgPrice<20) return 8;
    return 15;
  },
  orderProductRows(samples,startValue="2025-01-01"){
    const start=this.parseReportDate(startValue)||new Date(2025,0,1);
    start.setHours(0,0,0,0);
    const analysis=this.orderAnalysis({orders:samples.orders||[]},{year:"all",month:"all"});
    const profitRows=this.profitRows(samples);
    const profitBySku=new Map();
    const profitByAsin=new Map();
    profitRows.forEach(r=>{
      if(r.sku) profitBySku.set(BBUtils.low(r.sku),r);
      if(r.asin&&r.asin!=="N/D") profitByAsin.set(BBUtils.low(r.asin),r);
    });
    const map=new Map();
    (analysis.validItems||analysis.normalizedItems||[]).filter(item=>item.date&&item.date>=start).forEach(item=>{
      const matched=(item.sku&&profitBySku.get(BBUtils.low(item.sku)))||(item.asin&&profitByAsin.get(BBUtils.low(item.asin)))||null;
      const asin=item.asin||matched?.asin||"N/D";
      const sku=item.sku||matched?.sku||"";
      const title=item.title||matched?.title||"";
      const key=sku||asin||title||item.identity;
      const row=map.get(key)||{year:"2025-oggi",asin,sku,title,sales:0,units:0,profit:0,margin:NaN,latestDate:null,orders:new Set(),source:"Report ordini validi"};
      row.asin=row.asin==="N/D"&&asin!=="N/D"?asin:row.asin;
      row.sku=row.sku||sku;
      row.title=row.title||title;
      row.sales+=item.sales||0;
      row.units+=item.qty||0;
      if(item.id) row.orders.add(item.id);
      if(item.date&&(!row.latestDate||item.date>row.latestDate)) row.latestDate=item.date;
      map.set(key,row);
    });
    return Array.from(map.values()).map(r=>({...r,orders:r.orders.size})).sort((a,b)=>b.sales-a.sales);
  },
  productCostRows(samples,c){
    const profiles=this.costProfiles();
    const orderRows=this.orderProductRows(samples,"2025-01-01");
    const sourceRows=orderRows.length?orderRows:this.profitRows(samples);
    const salesTotal=sourceRows.reduce((a,r)=>a+(r.sales||0),0) || c.sales || 0;
    const adsContext=this.historicalAdsContext(samples,c,"2025-01-01");
    return sourceRows.map(r=>{
      const text=[r.title,r.sku,r.asin,this.categoryForText(r.title||r.sku||"")].join(" ");
      const key=this.costProfileKey(text);
      const profile=profiles[key] || profiles.altro;
      const units=r.units||0;
      const salePrice=BBUtils.num(profile.salePrice) || (units?(r.sales||0)/units:0);
      const simulatedRevenue=BBUtils.num(profile.salePrice) && units ? units*salePrice : (r.sales||0);
      const adhesive=units*BBUtils.num(profile.adhesive);
      const ink=units*BBUtils.num(profile.ink);
      const packaging=units*BBUtils.num(profile.packaging);
      const shipping=units*BBUtils.num(profile.shipping);
      const referralRate=BBUtils.num(profile.amazonCommission) || this.amazonReferralRate(r);
      const referral=simulatedRevenue*referralRate/100;
      const adsAllocated=salesTotal&&adsContext.allocatedAmount?(r.sales||0)/salesTotal*adsContext.allocatedAmount:0;
      const internal=adhesive+ink+packaging+shipping;
      const totalCost=internal+referral+adsAllocated;
      const costPerSale=units?totalCost/units:0;
      const net=simulatedRevenue-totalCost;
      const margin=simulatedRevenue?net/simulatedRevenue*100:NaN;
      return {...r,category:this.categoryForText(text),profileKey:key,profileLabel:profile.label,salePrice,simulatedRevenue,adhesive,ink,packaging,shipping,referral,referralRate,adsAllocated,internal,totalCost,costPerSale,net,marginAfterCosts:margin,dataSource:orderRows.length?"Report ordini validi":"Profit Report"};
    }).sort((a,b)=>(a.marginAfterCosts||0)-(b.marginAfterCosts||0));
  },
  productCostSummary(samples,c){
    const rows=this.productCostRows(samples,c);
    const adsContext=this.historicalAdsContext(samples,c,"2025-01-01");
    const sum=(field)=>rows.reduce((a,r)=>a+(r[field]||0),0);
    const byProfile=new Map();
    rows.forEach(r=>{
      const o=byProfile.get(r.profileKey)||{profileKey:r.profileKey,profileLabel:r.profileLabel,sales:0,simulatedRevenue:0,units:0,adhesive:0,ink:0,packaging:0,shipping:0,referral:0,adsAllocated:0,internal:0,totalCost:0,costPerSale:0,net:0,marginAfterCosts:NaN,count:0};
      ["sales","simulatedRevenue","units","adhesive","ink","packaging","shipping","referral","adsAllocated","internal","totalCost","net"].forEach(k=>o[k]+=r[k]||0);
      o.count+=1;
      o.costPerSale=o.units?o.totalCost/o.units:0;
      o.marginAfterCosts=o.simulatedRevenue?o.net/o.simulatedRevenue*100:NaN;
      byProfile.set(r.profileKey,o);
    });
    const totalSales=sum("sales");
    const totalNet=sum("net");
    return {
      rows,
      profiles:this.costProfiles(),
      sourceLabel:rows[0]?.dataSource||"Nessun dato",
      adsContext,
      totals:{
        sales:totalSales,
        simulatedRevenue:sum("simulatedRevenue"),
        units:sum("units"),
        adhesive:sum("adhesive"),
        ink:sum("ink"),
        packaging:sum("packaging"),
        shipping:sum("shipping"),
        referral:sum("referral"),
        adsAllocated:sum("adsAllocated"),
        internal:sum("internal"),
        totalCost:sum("totalCost"),
        costPerSale:sum("units")?sum("totalCost")/sum("units"):0,
        net:totalNet,
        margin:sum("simulatedRevenue")?totalNet/sum("simulatedRevenue")*100:NaN
      },
      byProfile:Array.from(byProfile.values()).sort((a,b)=>a.net-b.net)
    };
  },
  fbaTestForItem(samples,item){
    const target=String(item?.asin||"").trim().toUpperCase();
    if(!target) return {units:0,sales:0,orders:0,firstSale:null,lastSale:null,rows:0,source:"Report ordini"};
    const start=this.parseReportDate(item?.activeAt || item?.receivedAt || item?.sentAt || item?.sendDate || "");
    if(start) start.setHours(0,0,0,0);
    const analysis=this.orderAnalysis({orders:samples.orders||[]},{year:"all",month:"all"});
    const valid=(analysis.validItems||analysis.normalizedItems||[]).filter(row=>{
      if(String(row.asin||"").trim().toUpperCase()!==target) return false;
      if(start && row.date && row.date<start) return false;
      if(start && !row.date) return false;
      const raw=row.row||{};
      const channel=String(BBUtils.pick(raw,["fulfillment-channel","Fulfillment Channel","fulfillment_channel","Canale gestione","Canale di gestione","Canale"])||"").trim().toLowerCase();
      // Se il report espone il canale, nel Test FBA consideriamo solo ordini gestiti da Amazon.
      if(channel && !/(amazon|afn|fba)/i.test(channel)) return false;
      return true;
    });
    const orderIds=new Set();
    let units=0,sales=0,firstSale=null,lastSale=null;
    valid.forEach(row=>{
      units+=BBUtils.num(row.qty);
      sales+=BBUtils.num(row.sales);
      if(row.id) orderIds.add(row.id);
      if(row.date && (!firstSale || row.date<firstSale)) firstSale=row.date;
      if(row.date && (!lastSale || row.date>lastSale)) lastSale=row.date;
    });
    const sent=BBUtils.num(item?.quantitySent)||BBUtils.num(item?.qty);
    return {
      units,sales,orders:orderIds.size,firstSale,lastSale,rows:valid.length,
      remaining:Math.max(sent-units,0),sellThrough:sent?units/sent*100:NaN,
      source:"Report ordini"
    };
  },
  fbaReconciliationForItem(samples,item){
    const actual=this.fbaTestForItem(samples,item);
    const target=String(item?.asin||"").trim().toUpperCase();
    const start=this.parseReportDate(item?.activeAt || item?.receivedAt || item?.sentAt || item?.sendDate || "");
    if(start) start.setHours(0,0,0,0);
    const adSources=[
      ["sponsored_products","Sponsored Products"],
      ["sponsored_brands","Sponsored Brands"],
      ["sponsored_display","Sponsored Display"]
    ];
    const asinFields=[
      "Advertised ASIN","ASIN pubblicizzato","ASIN pubblicizzata","ASIN",
      "Purchased ASIN","ASIN acquistato","ASIN acquistata","Child ASIN","ASIN figlio"
    ];
    const spendFields=["Spend","Spesa","Cost","Costo","Costo totale"];
    const salesFields=["Sales","Vendite","7 Day Total Sales","14 Day Total Sales","7 Day Total Sales (€)","14 Day Total Sales (€)"];
    const orderFields=["Orders","Ordini","7 Day Total Orders","14 Day Total Orders","Purchases","Acquisti"];
    const clickFields=["Clicks","Clic","Click"];
    const impressionFields=["Impressions","Impressioni","Viewable impressions","Impressioni visualizzabili"];
    let adSpend=0,adSales=0,adOrders=0,clicks=0,impressions=0,matchedRows=0,undatedRows=0;
    const sources=new Set();
    adSources.forEach(([key,label])=>{
      (samples[key]||[]).forEach(row=>{
        const explicitAsins=asinFields.map(field=>String(row?.[field]||"").trim().toUpperCase()).filter(Boolean);
        // Usiamo solo righe con un collegamento ASIN esplicito: campagne aggregate non vengono attribuite arbitrariamente.
        if(!target || !explicitAsins.includes(target)) return;
        const d=this.rowDate(row);
        if(start && d && d<start) return;
        if(start && !d) undatedRows+=1;
        matchedRows+=1;
        sources.add(label);
        adSpend+=BBUtils.num(BBUtils.pick(row,spendFields));
        adSales+=BBUtils.num(BBUtils.pick(row,salesFields));
        adOrders+=BBUtils.num(BBUtils.pick(row,orderFields));
        clicks+=BBUtils.num(BBUtils.pick(row,clickFields));
        impressions+=BBUtils.num(BBUtils.pick(row,impressionFields));
      });
    });
    const matchedAttributedSales=Math.min(Math.max(adSales,0),Math.max(actual.sales,0));
    const notAttributedSales=Math.max(actual.sales-matchedAttributedSales,0);
    const excessAttributedSales=Math.max(adSales-actual.sales,0);
    const tacos=actual.sales>0?adSpend/actual.sales*100:NaN;
    const acos=adSales>0?adSpend/adSales*100:NaN;
    let status="nessuna_vendita",label="Nessuna vendita rilevata",confidence="alta";
    if(actual.sales>0 && !matchedRows){
      status="non_riconciliabile";
      label="Vendite reali senza dato Ads per ASIN";
      confidence="bassa";
    }else if(excessAttributedSales>0.01){
      status="periodi_non_allineati";
      label="Attribuzione Ads e ordini non allineati";
      confidence="bassa";
    }else if(actual.sales>0 && adSales>0 && notAttributedSales>0.01){
      status="mista";
      label="Parte Ads + parte non attribuita";
      confidence=undatedRows?"media":"alta";
    }else if(actual.sales>0 && adSales>0){
      status="attribuita_ads";
      label="Vendite coperte dall'attribuzione Ads";
      confidence=undatedRows?"media":"alta";
    }else if(actual.sales>0){
      status="non_attribuita_ads";
      label="Non attribuita nei report Ads";
      confidence=matchedRows?"media":"bassa";
    }

    const storeRows=[...(samples.store_date||[]),...(samples.store_live_page||[]),...(samples.store_not_live_page||[]),...(samples.store_source||[])];
    const title=String(item?.title||"").trim().toLowerCase();
    let storeMatches=0,storeViews=0,storeOrders=0,storeSales=0;
    storeRows.forEach(row=>{
      const haystack=Object.values(row||{}).join(" ").toLowerCase();
      const direct=target && haystack.includes(target.toLowerCase());
      const byTitle=title.length>=8 && haystack.includes(title);
      if(!direct && !byTitle) return;
      storeMatches+=1;
      storeViews+=BBUtils.num(BBUtils.pick(row,["Views","Visualizzazioni","Page views","Visite"]));
      storeOrders+=BBUtils.num(BBUtils.pick(row,["Orders","Ordini","Purchases","Acquisti"]));
      storeSales+=BBUtils.num(BBUtils.pick(row,["Sales","Vendite","Attributed Sales","Vendite attribuite"]));
    });

    return {
      ...actual,
      adSpend,adSales,adOrders,clicks,impressions,matchedRows,undatedRows,
      matchedAttributedSales,notAttributedSales,excessAttributedSales,tacos,acos,
      status,label,confidence,adSources:Array.from(sources),
      storeMatches,storeViews,storeOrders,storeSales,
      note:"Le vendite non attribuite non sono automaticamente organiche: possono derivare da ritorni successivi, ricerca diretta o finestre di attribuzione diverse."
    };
  },
  fbaSuggestionForAsin(samples,asin){
    const target=String(asin||"").trim().toUpperCase();
    if(!target) return null;
    const asinRows=this.asinDecisionRows ? this.asinDecisionRows(samples) : [];
    const productRows=this.productCostRows ? this.productCostRows(samples,this.calc(samples)) : [];
    const fromAsin=asinRows.find(r=>String(r.asin||"").toUpperCase()===target);
    const fromCost=productRows.find(r=>String(r.asin||"").toUpperCase()===target);
    const raw={title:"",sku:"",sales:0,units:0,price:0,stock:0,source:new Set()};
    const remember=(r,source)=>{
      const rowAsin=String(BBUtils.pick(r,["asin1","asin","ASIN","product-id","Product ID","Parent ASIN","Child ASIN"])||"").trim().toUpperCase();
      if(rowAsin!==target) return;
      raw.source.add(source);
      raw.title=raw.title || BBUtils.pick(r,["item-name","product-name","Product Name","Title","Titolo","Nome prodotto"]);
      raw.sku=raw.sku || BBUtils.pick(r,["seller-sku","sku","SKU","MSKU"]);
      raw.price=raw.price || BBUtils.num(BBUtils.pick(r,["price","Prezzo","Your Price","item-price","Item Price","Prezzo articolo","Prezzo dell'articolo"]));
      raw.sales+=BBUtils.num(BBUtils.pick(r,["Ordered Product Sales","Vendite di prodotti ordinati","Vendite prodotto ordinate","Vendite nette","Vendite","Sales","Net sales","item-price","Item Price","Prezzo articolo","Product Sales","Vendite prodotto"]));
      raw.units+=BBUtils.num(BBUtils.pick(r,["Units Ordered","Unità ordinate","Unità nette vendute","Unità vendute","Units","Units sold","Net units sold","quantity-purchased","Quantity","Quantità","quantity"]));
      raw.stock=raw.stock || BBUtils.num(BBUtils.pick(r,["quantity","Quantità","available","fulfillable"]));
    };
    (samples.inventory||[]).forEach(r=>remember(r,"Inventario"));
    (samples.orders||[]).forEach(r=>remember(r,"Ordini"));
    (samples.business_report||[]).forEach(r=>remember(r,"Business Report"));
    (samples.profit_report||[]).forEach(r=>remember(r,"Profit Report"));
    if(!fromAsin && !fromCost && !raw.source.size) return null;
    const title=(fromAsin?.title || fromCost?.title || raw.title || "").trim();
    const units=BBUtils.num(fromCost?.units || fromAsin?.units || raw.units);
    const sales=BBUtils.num(fromCost?.sales || fromAsin?.sales || raw.sales);
    const salePrice=BBUtils.num(fromCost?.salePrice) || (units?sales/units:0) || raw.price;
    const text=[title,fromCost?.sku,fromCost?.category].join(" ");
    const inferredProfileKey=this.costProfileKey(text);
    const profileKey=inferredProfileKey!=="altro" ? inferredProfileKey : (fromCost?.profileKey || "altro");
    const profiles=this.costProfiles();
    const profile=profiles[profileKey] || profiles.altro;
    const productionCost=BBUtils.num(profile.adhesive)+BBUtils.num(profile.ink)+BBUtils.num(profile.packaging);
    return {
      asin:target,
      title,
      salePrice:salePrice || BBUtils.num(profile.salePrice),
      productionCost,
      profileKey,
      profileLabel:profile.label,
      units,
      sales,
      sku:fromCost?.sku || fromAsin?.sku || raw.sku || "",
      stock:fromAsin?.stock ?? raw.stock,
      source:Array.from(raw.source).join(", ") || fromAsin?.source || "",
      profit:BBUtils.num(fromCost?.net ?? fromAsin?.profit),
      margin:fromCost?.marginAfterCosts ?? fromAsin?.margin
    };
  },
  productStrategyRows(samples){
    const map=new Map();
    const ensure=cat=>{
      const o=map.get(cat)||{category:cat,sales:0,units:0,profit:0,views:0,visits:0,orders:0,keywords:0,keywordSales:0,keywordSpend:0,pages:new Set(),products:new Set()};
      map.set(cat,o);
      return o;
    };
    this.profitRows(samples).forEach(r=>{
      const cat=this.categoryForText((r.title||"")+" "+(r.sku||"")+" "+(r.asin||""));
      const o=ensure(cat);
      o.sales+=r.sales||0;
      o.units+=r.units||0;
      o.profit+=r.profit||0;
      if(r.title) o.products.add(r.title);
    });
    this.storeMetricRows(samples.store_live_page||[],"Pagine attive","Pagina Store").forEach(r=>{
      const cat=this.categoryForText(r.name);
      const o=ensure(cat);
      o.views+=r.views||0;
      o.visits+=r.visits||0;
      o.orders+=r.orders||0;
      o.sales+=r.sales||0;
      o.units+=r.units||0;
      o.pages.add(r.name);
    });
    this.keywordRows(samples).forEach(r=>{
      const cat=this.categoryForText(r.term);
      const o=ensure(cat);
      o.keywords+=1;
      o.keywordSales+=r.sales||0;
      o.keywordSpend+=r.spend||0;
    });
    return Array.from(map.values()).map(o=>{
      const margin=o.sales?o.profit/o.sales*100:NaN;
      const conversion=o.visits&&o.orders?o.orders/o.visits*100:NaN;
      let decision="Da osservare", action="Monitora altri dati";
      if(o.profit>=100 && o.units>=5){
        decision="Crea varianti";
        action="Crea nuove varianti di disegno sul tema che vende gia'.";
      }else if(o.visits>=100 && o.orders===0){
        decision="Rifai pagina";
        action="La pagina attira traffico ma non converte: migliora immagini, ordine prodotti e promessa.";
      }else if(o.sales>0 && Number.isFinite(margin) && margin<25){
        decision="Correggi margine";
        action="Rivedi prezzo, formato o costo produzione prima di spingere.";
      }else if(o.keywordSales>0 || o.sales>0){
        decision="Spingi test";
        action="Testa Ads mirate e una variante nuova con budget controllato.";
      }
      return {...o,margin,conversion,decision,action,pages:Array.from(o.pages).join(", "),products:Array.from(o.products).slice(0,2).join(" | ")};
    }).filter(o=>o.sales||o.views||o.keywordSpend||o.keywords).sort((a,b)=>(b.profit||0)-(a.profit||0) || (b.sales||0)-(a.sales||0)).slice(0,50);
  },
  storeInsights(samples,c){
    const pages=this.storeMetricRows(samples.store_live_page||[],"Pagine attive","Pagina Store");
    const oldPages=this.storeMetricRows(samples.store_not_live_page||[],"Altre pagine","Pagina non attiva");
    const sources=this.storeMetricRows(samples.store_source||[],"Fonte","Fonte traffico");
    const dates=this.storeMetricRows(samples.store_date||[],"Data","Giorno");
    const pageDecisions=pages.concat(oldPages).map(r=>{
      let decision="Da monitorare", action="Osserva";
      if(r.sales>0 && r.visits>0 && r.orderRate>=1){
        decision="Da spingere"; action="Aumenta visibilita' e collega Ads/Search Terms.";
      }else if(r.visits>=20 && r.sales===0){
        decision="Da correggere"; action="Pagina con traffico ma zero vendite: migliora hero, immagini e prodotti.";
      }else if(r.views>0 && r.visits<20){
        decision="Da testare"; action="Porta traffico mirato prima di giudicarla.";
      }
      return {...r,decision,action};
    });
    const sourceDecisions=sources.map(r=>{
      let decision="Da monitorare", action="Osserva";
      if(r.sales>0 && r.salesPerVisit>=0.1){ decision="Da spingere"; action="Fonte che genera vendite: valuta budget o contenuti dedicati."; }
      else if(r.visits>=100 && r.sales===0){ decision="Da correggere"; action="Molto traffico senza vendite: controlla pertinenza e landing."; }
      return {...r,decision,action};
    });
    const bestDays=dates.filter(r=>r.sales>0).slice().sort((a,b)=>b.sales-a.sales).slice(0,8);
    return {pages:pageDecisions,sources:sourceDecisions,dates,bestDays,categories:this.productStrategyRows(samples),storeSales:c.storeSales,storeUnits:c.storeUnits,storeOrders:c.storeOrders,storeViews:c.storeViews,storeVisitors:c.storeVisitors,storeNewVisitors:c.storeNewVisitors};
  },
  seasonalFocus(date=new Date()){
    const month=date.getMonth()+1;
    if([1,2].includes(month)) return {season:"Gennaio-Febbraio",focus:"Cameretta calma e ordine dopo le feste",action:"Spingi linee soft, neutre, stelle/luna e gift nascita non stagionali."};
    if([3,4,5].includes(month)) return {season:"Primavera",focus:"Restyling cameretta e casa piu' luminosa",action:"Testa palette salvia, sabbia, cipria, animali soft e mongolfiere."};
    if([6,7].includes(month)) return {season:"Estate",focus:"Viaggio, leggerezza e preparazione autunno",action:"Prepara lancio Back to room: mongolfiere, aerei, mappe, greche leggere."};
    if([8,9].includes(month)) return {season:"Back to school / nuova cameretta",focus:"Rinnovo stanza e organizzazione",action:"Spingi set coordinati, quadri + adesivi, greche e temi ordinati."};
    if([10,11].includes(month)) return {season:"Pre-Natale",focus:"Gift, nonni e regali emozionali",action:"Lancia bundle regalo, personalizzazioni nome e set premium."};
    return {season:"Natale",focus:"Regalo nascita e cameretta pronta",action:"Spingi gift box, set premium, temi luna/stelle, animali e messaggi personalizzati."};
  },
  parseReportDate(value){
    const s=String(value||"").trim();
    if(!s) return null;
    let m=s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if(m) return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    m=s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if(m){
      const y=Number(m[3].length===2?"20"+m[3]:m[3]);
      return new Date(y,Number(m[2])-1,Number(m[1]));
    }
    const parsed=new Date(s);
    return Number.isNaN(parsed.getTime())?null:new Date(parsed.getFullYear(),parsed.getMonth(),parsed.getDate());
  },
  dateKey(date){
    if(!date) return "";
    return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
  },
  rowDate(r){
    return this.parseReportDate(BBUtils.pick(r,[
      "Data","Date","Report Date","Data del report","Data di inizio","Start Date",
      "Data di fine","End Date","date","start-date","end-date",
      "purchase-date","order-date","payments-date","shipment-date","last-updated-date"
    ]));
  },
  rowCoverageDate(r){
    return this.parseReportDate(BBUtils.pick(r,[
      "Data di fine","End Date","date-end","end-date","Data fine",
      "purchase-date","order-date","payments-date","shipment-date","last-updated-date",
      "Data","Date","Report Date","Data del report"
    ]));
  },
  rowSales(r){
    return BBUtils.num(BBUtils.pick(r,[
      "Vendite nette","Net sales","Vendite","Sales","Ordered Product Sales","Vendite di prodotti ordinati","Vendite prodotto ordinate",
      "item-price","Item Price","Prezzo articolo","Product Sales","Vendite prodotto"
    ]));
  },
  rowUnits(r){
    return BBUtils.num(BBUtils.pick(r,[
      "Unità nette vendute","Net units sold","Units sold","Unita","Unità","Units","Units Ordered","Unita ordinate","Unità ordinate",
      "quantity-purchased","Quantity","Quantità"
    ]));
  },
  rowTraffic(r){
    return BBUtils.num(BBUtils.pick(r,[
      "Visualizzazioni","Views","Page Views","Page views","Sessions","Sessioni",
      "Visite","Visitatori","Visits","Visitors"
    ]));
  },
  parsePeriodDate(value,preferMDY=false){
    const s=String(value||"").trim();
    if(!s) return null;
    const m=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if(m){
      const a=Number(m[1]),b=Number(m[2]),year=Number(m[3]);
      const month=preferMDY||b>12?a:b;
      const day=preferMDY||b>12?b:a;
      if(month>=1&&month<=12&&day>=1&&day<=31){
        const date=new Date(year,month-1,day);
        if(date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day) return date;
      }
    }
    return this.parseReportDate(value);
  },
  reportPeriod(rows,preferMDY=false){
    const starts=[],ends=[];
    (rows||[]).forEach(r=>{
      const englishDates=Object.prototype.hasOwnProperty.call(r,"Start Date")||Object.prototype.hasOwnProperty.call(r,"End Date");
      const start=this.parsePeriodDate(BBUtils.pick(r,["Data di inizio","Start Date","date-start","start-date","Data inizio"]),preferMDY||englishDates);
      const end=this.parsePeriodDate(BBUtils.pick(r,["Data di fine","End Date","date-end","end-date","Data fine"]),preferMDY||englishDates);
      if(start) starts.push(start);
      if(end) ends.push(end);
    });
    if(!starts.length&&!ends.length) return null;
    const start=starts.length?new Date(Math.min(...starts.map(d=>d.getTime()))):new Date(Math.min(...ends.map(d=>d.getTime())));
    const end=ends.length?new Date(Math.max(...ends.map(d=>d.getTime()))):new Date(Math.max(...starts.map(d=>d.getTime())));
    return {start,end,days:Math.max(1,Math.round((end-start)/86400000)+1)};
  },
  filePeriodFromRows(rows){
    const dates=[];
    const names=new Set((rows||[]).map(r=>String(r.__file_name||"")).filter(Boolean));
    names.forEach(name=>{
      const compact=name.match(/(?:19|20)\d{6}/g)||[];
      compact.forEach(s=>{
        const d=new Date(Number(s.slice(0,4)),Number(s.slice(4,6))-1,Number(s.slice(6,8)));
        if(!Number.isNaN(d.getTime())) dates.push(d);
      });
      const iso=name.match(/(?:19|20)\d{2}[-_.](?:0[1-9]|1[0-2])[-_.](?:0[1-9]|[12]\d|3[01])/g)||[];
      iso.forEach(s=>{
        const parts=s.split(/[-_.]/).map(Number);
        const d=new Date(parts[0],parts[1]-1,parts[2]);
        if(!Number.isNaN(d.getTime())) dates.push(d);
      });
    });
    if(dates.length<2) return null;
    const start=new Date(Math.min(...dates.map(d=>d.getTime())));
    const end=new Date(Math.max(...dates.map(d=>d.getTime())));
    return {start,end,days:Math.max(1,Math.round((end-start)/86400000)+1)};
  },
  historicalAdsContext(samples,c,startValue="2025-01-01"){
    const start=this.parseReportDate(startValue)||new Date(2025,0,1);
    const orderItems=this.orderAnalysis(samples).validItems.filter(item=>item.date&&item.date>=start);
    const latestOrder=orderItems.length?new Date(Math.max(...orderItems.map(item=>item.date.getTime()))):null;
    const sponsored=[...(samples.sponsored_products||[]),...(samples.sponsored_brands||[]),...(samples.sponsored_display||[])];
    const coverage=c.adsInvoice>0?this.filePeriodFromRows(samples.ad_invoices||[]):this.reportPeriod(sponsored,false);
    const tolerance=2*86400000;
    const comparable=!!(coverage&&latestOrder&&coverage.start.getTime()<=start.getTime()+tolerance&&coverage.end.getTime()>=latestOrder.getTime()-tolerance);
    const date=d=>d?d.toLocaleDateString("it-IT"):"—";
    return {
      amount:c.ads||0,
      allocatedAmount:comparable?(c.ads||0):0,
      comparable,
      sourceLabel:c.adsInvoice>0?"Fatture Ads":"Report campagne Ads",
      coverage,
      coverageLabel:coverage?date(coverage.start)+" – "+date(coverage.end):"Periodo Ads non disponibile",
      orderPeriodLabel:latestOrder?date(start)+" – "+date(latestOrder):"Periodo ordini non disponibile"
    };
  },
  profitReconciliation(samples,c){
    const profitRows=samples.profit_report||[];
    const period=this.reportPeriod(profitRows,true);
    const adRows=[...(samples.sponsored_products||[]),...(samples.sponsored_brands||[]),...(samples.sponsored_display||[])];
    const adPeriod=this.reportPeriod(adRows,false);
    const samePeriod=!!(period&&adPeriod&&Math.abs(period.start-adPeriod.start)<=86400000&&Math.abs(period.end-adPeriod.end)<=86400000);
    const matchedExternalAds=samePeriod?adRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Spend","Spesa","Cost","Costo","Costo totale"])),0):null;
    const includedAds=Math.abs(c.adsProfitReport||0);
    const extraAds=matchedExternalAds===null?null:Math.max(matchedExternalAds-includedAds,0);
    const rules=BBUtils.rules();
    const periodSubscription=period?BBUtils.num(rules.monthlyFee)*(period.days/30.4375):null;
    const baseProfit=profitRows.length?(c.netProfitReport||0):(c.profit||0);
    const comparableBalance=baseProfit-(extraAds||0)-(periodSubscription||0);
    const date=d=>d?d.toLocaleDateString("it-IT"):"—";
    return {
      period,
      periodLabel:period?date(period.start)+" – "+date(period.end):"Periodo non disponibile",
      baseProfit,
      fees:c.amazonFeesProfit||0,
      includedAds,
      matchedExternalAds,
      extraAds,
      periodSubscription,
      comparableBalance,
      complete:extraAds!==null,
      adPeriodLabel:adPeriod?date(adPeriod.start)+" – "+date(adPeriod.end):"Periodo Ads non disponibile"
    };
  },
  salesTimelineRows(samples){
    const sources=[
      ...(samples.store_date||[]),
      ...(samples.business_report||[]),
      ...(samples.orders||[])
    ];
    const map=new Map();
    sources.forEach(r=>{
      const d=this.rowDate(r);
      if(!d) return;
      const key=this.dateKey(d);
      const o=map.get(key)||{date:d,key,sales:0,units:0,traffic:0};
      o.sales+=this.rowSales(r);
      o.units+=this.rowUnits(r);
      o.traffic+=this.rowTraffic(r);
      map.set(key,o);
    });
    return Array.from(map.values()).sort((a,b)=>a.date-b.date);
  },
  weeklySales(samples,manualPending=[]){
    // Riutilizza lo stesso insieme deduplicato e validato della pagina Ordini.
    // In questo modo Executive, Analisi dati e riepilogo settimanale non
    // possono divergere sul conteggio di righe e quantità.
    const orderData=this.orderAnalysis(
      {orders:samples.orders||[]},
      {year:"all",month:"all"}
    );
    const official=(orderData.validItems||orderData.normalizedItems||[]).filter(r=>r.date);
    const manual=(manualPending||[]).map(r=>({
      date:r._dateObj||this.parseReportDate(r.date),
      qty:BBUtils.num(r.units),
      sales:BBUtils.num(r.amount)
    })).filter(r=>r.date);
    const dates=[...official,...manual].map(r=>r.date).filter(Boolean);
    if(!dates.length) return {hasData:false,sales:0,units:0,start:null,end:null,label:"Nessun dato settimanale"};

    const latest=new Date(Math.max(...dates.map(d=>d.getTime())));
    latest.setHours(0,0,0,0);
    const start=new Date(latest);
    start.setDate(start.getDate()-((start.getDay()+6)%7));
    const end=new Date(start);
    end.setDate(end.getDate()+6);
    end.setHours(23,59,59,999);
    const inWeek=r=>r.date>=start&&r.date<=end;
    const rows=[...official.filter(inWeek),...manual.filter(inWeek)];
    const sales=rows.reduce((a,r)=>a+r.sales,0);
    const units=rows.reduce((a,r)=>a+r.qty,0);
    const short=d=>d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"});
    return {
      hasData:true,
      sales,
      units,
      start,
      end,
      label:"Settimana "+short(start)+"–"+end.toLocaleDateString("it-IT")
    };
  },
  historicalSalesSummary(samples,startValue="2025-01-01",manualSales=[]){
    const start=this.parseReportDate(startValue)||new Date(2025,0,1);
    start.setHours(0,0,0,0);
    const orderData=this.orderAnalysis({orders:samples.orders||[]},{year:"all",month:"all"});
    const normalizedOrders=orderData.validItems||orderData.normalizedItems||[];
    const datedOrders=normalizedOrders.filter(r=>r.date);
    const candidates=[
      {type:"orders",label:"Report ordini",rows:datedOrders,sales:r=>r.sales,units:r=>r.qty},
      {type:"business_report",label:"Business Report",rows:samples.business_report||[],sales:r=>this.rowSales(r),units:r=>this.rowUnits(r)},
      {type:"profit_report",label:"Profit Report",rows:samples.profit_report||[],sales:r=>this.rowSales(r),units:r=>this.rowUnits(r)}
    ];
    let source=candidates.find(x=>x.rows.length&&x.rows.some(r=>(x.type==="orders"?r.date:this.rowDate(r))));
    let undated=false;
    if(!source){
      source=candidates.find(x=>x.rows.length)||null;
      undated=!!source;
    }
    const sourceRows=source?.rows||[];
    const datedSourceRows=sourceRows.map(r=>({
      row:r,
      date:source.type==="orders"?r.date:this.rowDate(r)
    })).filter(r=>r.date);
    const officialRows=undated
      ? sourceRows.map(r=>({row:r,date:null}))
      : datedSourceRows.filter(r=>r.date>=start);
    const manualStatus=this.manualSalesStatus(samples,manualSales||[]);
    const pendingManual=(manualStatus.pending||[]).map(r=>({
      row:r,
      date:r._dateObj||this.parseReportDate(r.date)
    })).filter(r=>r.date&&r.date>=start);
    const officialSales=officialRows.reduce((a,x)=>a+(source?source.sales(x.row):0),0);
    const officialUnits=officialRows.reduce((a,x)=>a+(source?source.units(x.row):0),0);
    const manualTotal=pendingManual.reduce((a,x)=>a+BBUtils.num(x.row.amount),0);
    const manualUnits=pendingManual.reduce((a,x)=>a+BBUtils.num(x.row.units),0);
    const datedIncluded=[...officialRows.map(x=>x.date),...pendingManual.map(x=>x.date)].filter(Boolean).sort((a,b)=>a-b);
    const allSourceDates=datedSourceRows.map(x=>x.date).sort((a,b)=>a-b);
    const coverageStart=allSourceDates[0]||datedIncluded[0]||null;
    const coverageEnd=datedIncluded[datedIncluded.length-1]||allSourceDates[allSourceDates.length-1]||null;
    const orderIds=source?.type==="orders"
      ? new Set(officialRows.map(x=>x.row.id).filter(Boolean))
      : new Set();
    const sales=officialSales+manualTotal;
    const units=officialUnits+manualUnits;
    const orders=orderIds.size;
    const coverageStatus=undated?"unknown":(!coverageStart?"missing":(coverageStart<=start?"complete":(source?.type==="orders"?"observed":"partial")));
    return {
      hasData:!!sourceRows.length||pendingManual.length>0,
      start,
      targetEnd:new Date(),
      sourceType:source?.type||"manual",
      sourceLabel:source?.label||"Vendite manuali",
      sales,
      units,
      orders,
      ordersAvailable:source?.type==="orders",
      averageOrder:orders?officialSales/orders:NaN,
      averageUnit:units?sales/units:NaN,
      officialSales,
      officialUnits,
      manualSales:manualTotal,
      manualUnits,
      manualRows:pendingManual.length,
      coverageStart,
      coverageEnd,
      coverageStatus,
      undated
    };
  },
  orderAnalysis(samples,filters={}){
    const rawRows=(samples.orders||[]).slice();
    const value=(row,names)=>BBUtils.pick(row,names);
    const orderId=row=>String(value(row,[
      "order-id","amazon-order-id","Amazon Order Id","Amazon Order ID","Numero ordine","Numero di ordine"
    ])||"").trim();
    const orderItemId=row=>String(value(row,[
      "order-item-id","Amazon Order Item Id","Amazon Order Item ID","Numero articolo ordine","ID articolo ordine"
    ])||"").trim();
    const quantity=row=>BBUtils.num(value(row,[
      "quantity-purchased","Quantity Purchased","Quantità acquistata","Quantita acquistata","quantity","Quantity","Quantità"
    ]));
    const revenue=row=>BBUtils.num(value(row,[
      "item-price","Item Price","Prezzo articolo","Prezzo dell'articolo","Totale articolo","Product Sales"
    ]));
    const rowDate=row=>this.parseReportDate(value(row,[
      "purchase-date","Purchase Date","Data acquisto","Data dell'acquisto","order-date","Data ordine","payments-date"
    ]));
    const asin=row=>String(value(row,["asin","ASIN","product-id","Product ID"])||"").trim();
    const sku=row=>String(value(row,["sku","seller-sku","Seller SKU","merchant-sku","SKU"])||"").trim();
    const title=row=>String(value(row,[
      "product-name","Product Name","item-name","Item Name","title","Titolo","Dettagli prodotto"
    ])||"").trim();
    const status=row=>String(value(row,[
      "order-status","Order Status","Stato ordine","item-status","Item Status","Stato articolo","status","Stato"
    ])||"").trim();
    const isCancelled=row=>/cancelled|canceled|annullat/i.test(status(row));

    const bestByIdentity=new Map();
    const duplicateRows=[];
    const rowQuality=item=>{
      const suspiciousTitle=/websiteorderchannel|false false false|amazon\.it\s+website|via\s+roe|via\s+scudieri/i.test(item.title);
      let score=0;
      if(item.id) score+=20;
      if(item.itemId) score+=8;
      if(item.date) score+=4;
      if(item.qty>0) score+=20;
      if(item.sales>0) score+=20;
      if(item.asin) score+=3;
      if(item.sku) score+=3;
      if(item.title) score+=Math.max(1,8-Math.floor(item.title.length/180));
      if(suspiciousTitle) score-=30;
      return score;
    };
    rawRows.forEach((row,index)=>{
      const id=orderId(row);
      const itemId=orderItemId(row);
      const date=rowDate(row);
      const qty=quantity(row);
      const sales=revenue(row);
      const identity=itemId
        ? "item:"+itemId
        : "row:"+[id,this.dateKey(date),asin(row),sku(row),qty,sales,title(row)].join("|").toLowerCase();
      const item={row,index,id,itemId,date,qty,sales,asin:asin(row),sku:sku(row),title:title(row),status:status(row),cancelled:isCancelled(row),identity};
      item.quality=rowQuality(item);
      const existing=bestByIdentity.get(identity);
      if(existing){
        if(item.quality>existing.quality){
          duplicateRows.push(existing);
          bestByIdentity.set(identity,item);
        }else{
          duplicateRows.push(item);
        }
      }else{
        bestByIdentity.set(identity,item);
      }
    });
    const normalized=Array.from(bestByIdentity.values());

    const cancelled=normalized.filter(r=>r.id&&r.cancelled);
    const valid=normalized.filter(r=>r.id&&!r.cancelled&&Number.isFinite(r.qty)&&r.qty>0);
    const monthMap=new Map();
    const orderMap=new Map();
    valid.forEach(item=>{
      const monthKey=item.date ? item.date.getFullYear()+"-"+String(item.date.getMonth()+1).padStart(2,"0") : "senza-data";
      const month=monthMap.get(monthKey)||{
        key:monthKey,
        year:item.date?item.date.getFullYear():null,
        month:item.date?item.date.getMonth():null,
        label:item.date?new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(item.date):"Senza data",
        orderIds:new Set(),
        lines:0,
        units:0,
        revenue:0
      };
      month.orderIds.add(item.id);
      month.lines++;
      month.units+=item.qty;
      month.revenue+=item.sales;
      monthMap.set(monthKey,month);

      const groupKey=monthKey+"|"+item.id;
      const order=orderMap.get(groupKey)||{
        key:groupKey,
        id:item.id,
        date:item.date,
        monthKey,
        lines:[],
        units:0,
        revenue:0
      };
      if(item.date && (!order.date || item.date<order.date)) order.date=item.date;
      order.lines.push(item);
      order.units+=item.qty;
      order.revenue+=item.sales;
      orderMap.set(groupKey,order);
    });

    const monthly=Array.from(monthMap.values()).map(m=>({
      ...m,
      orders:m.orderIds.size,
      averageOrder:m.orderIds.size?m.revenue/m.orderIds.size:NaN
    })).sort((a,b)=>String(a.key).localeCompare(String(b.key)));
    const years=Array.from(new Set(monthly.filter(m=>m.year!==null).map(m=>m.year))).sort((a,b)=>b-a);
    const requestedYear=filters.year&&filters.year!=="all"?Number(filters.year):null;
    const selectedYear=requestedYear&&years.includes(requestedYear)?requestedYear:(years[0]||null);
    const monthsForYear=monthly.filter(m=>selectedYear===null||m.year===selectedYear);
    const requestedMonth=filters.month&&filters.month!=="all"?Number(filters.month):null;
    const selectedMonth=requestedMonth!==null&&monthsForYear.some(m=>m.month===requestedMonth)
      ? requestedMonth
      : null;
    const filteredMonths=selectedMonth===null?monthsForYear:monthsForYear.filter(m=>m.month===selectedMonth);
    const detailMonth=selectedMonth!==null
      ? monthsForYear.find(m=>m.month===selectedMonth)
      : monthsForYear[monthsForYear.length-1];
    const detailOrders=detailMonth
      ? Array.from(orderMap.values()).filter(o=>o.monthKey===detailMonth.key).sort((a,b)=>(b.date||0)-(a.date||0)||a.id.localeCompare(b.id))
      : [];

    const selectedIndex=detailMonth?monthly.findIndex(m=>m.key===detailMonth.key):-1;
    const current=selectedIndex>=0?monthly[selectedIndex]:null;
    const previous=selectedIndex>0?monthly[selectedIndex-1]:null;
    const delta=(now,before)=>before?((now-before)/Math.abs(before))*100:NaN;
    const comparison=current?{
      current,
      previous,
      orders:delta(current.orders,previous?.orders),
      lines:delta(current.lines,previous?.lines),
      units:delta(current.units,previous?.units),
      revenue:delta(current.revenue,previous?.revenue),
      averageOrder:delta(current.averageOrder,previous?.averageOrder)
    }:null;

    const visibleOrders=new Set();
    let visibleLines=0,visibleUnits=0,visibleRevenue=0;
    filteredMonths.forEach(m=>{
      m.orderIds.forEach(id=>visibleOrders.add(id));
      visibleLines+=m.lines;
      visibleUnits+=m.units;
      visibleRevenue+=m.revenue;
    });
    const missingOrderIds=normalized.filter(r=>!r.id).length;
    const nonCancelled=normalized.filter(r=>!r.cancelled);
    const invalidQuantity=nonCancelled.filter(r=>!Number.isFinite(r.qty)||r.qty<=0).length;
    const invalidRevenue=nonCancelled.filter(r=>{
      const raw=value(r.row,["item-price","Item Price","Prezzo articolo","Prezzo dell'articolo","Totale articolo","Product Sales"]);
      return raw===""||raw===null||raw===undefined||!Number.isFinite(r.sales)||r.sales<0;
    }).length;
    const monthlyLines=monthly.reduce((a,m)=>a+m.lines,0);
    const monthlyUnits=monthly.reduce((a,m)=>a+m.units,0);
    const monthlyRevenue=monthly.reduce((a,m)=>a+m.revenue,0);
    const totals={
      orders:new Set(valid.map(r=>r.id)).size,
      lines:valid.length,
      units:valid.reduce((a,r)=>a+r.qty,0),
      revenue:valid.reduce((a,r)=>a+r.sales,0)
    };
    const arithmeticOk=monthlyLines===totals.lines &&
      Math.abs(monthlyUnits-totals.units)<0.0001 &&
      Math.abs(monthlyRevenue-totals.revenue)<0.005;
    const coherence={
      ok:missingOrderIds===0&&invalidQuantity===0&&invalidRevenue===0&&arithmeticOk,
      rawLines:rawRows.length,
      activeLines:normalized.length,
      duplicateLines:duplicateRows.length,
      cancelledLines:cancelled.length,
      cancelledOrders:new Set(cancelled.map(r=>r.id)).size,
      missingOrderIds,
      invalidQuantity,
      invalidRevenue,
      arithmeticOk
    };

    return {
      hasData:rawRows.length>0,
      totals,
      visible:{
        orders:visibleOrders.size,
        lines:visibleLines,
        units:visibleUnits,
        revenue:visibleRevenue,
        averageOrder:visibleOrders.size?visibleRevenue/visibleOrders.size:NaN
      },
      monthly,
      years,
      selectedYear,
      selectedMonth,
      availableMonths:monthsForYear.map(m=>({value:m.month,label:m.label,key:m.key})),
      filteredMonths,
      detailMonth,
      detailOrders,
      normalizedItems:valid,
      validItems:valid,
      allItems:normalized,
      cancelledItems:cancelled,
      comparison,
      coherence
    };
  },
  executiveSalesOverview(samples,c,filters={}){
    const rules=BBUtils.rules();
    const manual=this.manualSalesStatus(samples,rules.manualSales||[]);
    const sourceType=(samples.orders||[]).length?"orders":
      ((samples.business_report||[]).length?"business_report":
      ((samples.profit_report||[]).length?"profit_report":
      ((samples.store_date||[]).length?"store_date":"")));
    const sourceRows=sourceType?(samples[sourceType]||[]):[];
    const sourceLabel={
      orders:"Report ordini",
      business_report:"Business Report",
      profit_report:"Profit Report",
      store_date:"Store Amazon"
    }[sourceType] || "Report Amazon";
    const map=new Map();
    const ensure=date=>{
      const key=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
      const o=map.get(key)||{key,year:date.getFullYear(),month:date.getMonth(),label:"",sales:0,units:0,traffic:0,featuredValues:[],manualSales:0,manualUnits:0};
      o.label=new Intl.DateTimeFormat("it-IT",{month:"short",year:"numeric"}).format(date).replace(".","");
      map.set(key,o);
      return o;
    };
    sourceRows.forEach(r=>{
      const date=this.rowDate(r);
      if(!date) return;
      const o=ensure(date);
      o.sales+=this.rowSales(r);
      o.units+=this.rowUnits(r);
      o.traffic+=this.rowTraffic(r);
      const featured=BBUtils.pick(r,[
        "Featured Offer %","Featured Offer Percentage","Featured Offer (Buy Box) Percentage",
        "Percentuale Featured Offer","Featured Offer","Buy Box Percentage","Buy Box %",
        "Percentuale Buy Box","Featured Offer % (Buy Box)"
      ]);
      if(featured!==""){
        let v=BBUtils.num(featured);
        if(v>0 && v<=1) v*=100;
        if(v>0) o.featuredValues.push(v);
      }
    });
    (manual.pending||[]).forEach(r=>{
      const date=this.parseReportDate(r.date);
      if(!date) return;
      const o=ensure(date);
      const amount=BBUtils.num(r.amount), units=BBUtils.num(r.units);
      o.sales+=amount;
      o.units+=units;
      o.manualSales+=amount;
      o.manualUnits+=units;
    });
    let rows=Array.from(map.values()).filter(r=>r.sales||r.units||r.traffic).sort((a,b)=>a.year-b.year || a.month-b.month);
    if(!rows.length) return null;
    const allRows=rows.slice();
    const years=Array.from(new Set(allRows.map(r=>r.year))).sort((a,b)=>b-a);
    const selectedYear=filters.year&&filters.year!=="all" ? Number(filters.year) : years[0];
    let selectedMonth=filters.month&&filters.month!=="all" ? Number(filters.month) : null;
    rows=rows.filter(r=>r.year===selectedYear);
    const availableMonths=allRows.filter(r=>r.year===selectedYear).map(r=>({value:r.month,label:r.label}));
    if(selectedMonth!==null && !availableMonths.some(m=>m.value===selectedMonth)) selectedMonth=null;
    if(selectedMonth!==null) rows=rows.filter(r=>r.month===selectedMonth);
    if(!rows.length) return {
      year:selectedYear,
      selectedMonth,
      sourceType,
      sourceLabel,
      rows:[],
      allRows,
      years,
      availableMonths,
      totalSales:0,
      totalUnits:0,
      avgPrice:NaN,
      insight:["Nessun dato trovato per il periodo selezionato."]
    };
    const totalSales=rows.reduce((a,r)=>a+r.sales,0);
    const totalUnits=rows.reduce((a,r)=>a+r.units,0);
    const avgPrice=totalUnits?totalSales/totalUnits:NaN;
    const bestSales=rows.slice().sort((a,b)=>b.sales-a.sales)[0]||null;
    const bestUnits=rows.slice().sort((a,b)=>b.units-a.units)[0]||null;
    const positiveRows=rows.filter(r=>r.sales||r.units);
    const weakest=positiveRows.slice().sort((a,b)=>a.sales-b.sales)[0]||null;
    const latest=rows[rows.length-1]||null;
    rows.forEach(r=>{
      r.featuredAvg=r.featuredValues.length?r.featuredValues.reduce((a,v)=>a+v,0)/r.featuredValues.length:NaN;
    });
    const featuredRows=rows.filter(r=>Number.isFinite(r.featuredAvg));
    const featuredAvg=featuredRows.length?featuredRows.reduce((a,r)=>a+r.featuredAvg,0)/featuredRows.length:NaN;
    const manualSales=rows.reduce((a,r)=>a+r.manualSales,0);
    const manualUnits=rows.reduce((a,r)=>a+r.manualUnits,0);
    const insight=[];
    if(bestSales) insight.push("Mese migliore: "+bestSales.label+" con "+BBUtils.euro(bestSales.sales)+" e "+(bestSales.units||0)+" unita.");
    if(latest && bestSales && latest.key!==bestSales.key && latest.sales<bestSales.sales*0.7) insight.push("L'ultimo mese e' sotto il picco: controlla traffico, disponibilita', prezzo e Ads prima di spingere nuovi prodotti.");
    if(Number.isFinite(featuredAvg)) insight.push("Featured Offer media: "+BBUtils.pct(featuredAvg)+". Sopra 95% e' buona; sotto 85% puo' frenare le conversioni.");
    if(manualSales>0) insight.push("Include vendite infrasettimanali non ancora coperte dai report: "+BBUtils.euro(manualSales)+" e "+manualUnits+" unita.");
    if(!insight.length) insight.push("Carica Business Report o Report ordini con date per ottenere una lettura mensile piu precisa.");
    return {
      year:selectedYear,
      selectedMonth,
      sourceType,
      sourceLabel,
      allRows,
      years,
      availableMonths,
      rows,
      totalSales,
      totalUnits,
      avgPrice,
      bestSales,
      bestUnits,
      weakest,
      latest,
      featuredAvg,
      manualSales,
      manualUnits,
      periodStart:rows[0],
      periodEnd:rows[rows.length-1],
      insight
    };
  },
  officialSalesCutoffDate(samples){
    const sources=[
      ...(samples.store_date||[]),
      ...(samples.business_report||[]),
      ...(samples.orders||[])
    ];
    return sources.reduce((latest,r)=>{
      const d=this.rowCoverageDate(r);
      return d && (!latest || d>latest) ? d : latest;
    },null);
  },
  manualSalesStatus(samples,manualSales){
    const cutoff=this.officialSalesCutoffDate(samples);
    const titles=this.productTitleMap(samples);
    const rows=(manualSales||[]).map(r=>{
      const date=this.parseReportDate(r.date);
      const covered=!!(cutoff && date && date<=cutoff);
      const asin=String(r.asin||"").trim().toUpperCase();
      const description=String(r.description||"").trim() || titles.get(asin) || "";
      return {...r,asin,description,_dateObj:date,_coveredByReport:covered};
    });
    const pending=rows.filter(r=>!r._coveredByReport);
    const covered=rows.filter(r=>r._coveredByReport);
    const sum=(arr,key)=>arr.reduce((a,r)=>a+BBUtils.num(r[key]),0);
    return {
      cutoff,
      rows,
      pending,
      covered,
      pendingTotal:sum(pending,"amount"),
      pendingUnits:sum(pending,"units"),
      coveredTotal:sum(covered,"amount"),
      coveredUnits:sum(covered,"units")
    };
  },
  featuredOfferRows(samples){
    const cols=[
      "Featured Offer %","Featured Offer Percentage","Featured Offer (Buy Box) Percentage",
      "Percentuale Featured Offer","Featured Offer","Buy Box Percentage","Buy Box %",
      "Percentuale Buy Box","Featured Offer % (Buy Box)"
    ];
    return (samples.business_report||[]).map(r=>{
      const raw=BBUtils.pick(r,cols);
      if(raw==="") return null;
      let value=BBUtils.num(raw);
      if(value>0 && value<=1) value=value*100;
      return {date:this.rowDate(r),value,row:r};
    }).filter(x=>x && x.value>0).sort((a,b)=>(a.date||0)-(b.date||0));
  },
  trafficNoSalesRows(samples){
    const titles=this.productTitleMap(samples);
    const fromBusiness=(samples.business_report||[]).map(r=>{
      const asin=BBUtils.pick(r,["ASIN","Parent ASIN","Child ASIN"])||"N/D";
      const title=BBUtils.pick(r,["Title","Titolo","Product Name","Nome prodotto"])||titles.get(asin)||"";
      const traffic=this.rowTraffic(r);
      const sales=this.rowSales(r);
      const units=this.rowUnits(r);
      return {source:"Business Report",asin,title,page:"",traffic,sales,units,action:"Controlla prezzo, Featured Offer, immagini e stock."};
    });
    const fromStore=(samples.store_live_page||[]).concat(samples.store_not_live_page||[]).map(r=>{
      const page=BBUtils.pick(r,["Pagine attive","Altre pagine","Page","Pagina","Name"])||"";
      const traffic=this.rowTraffic(r);
      const sales=this.rowSales(r);
      const units=this.rowUnits(r);
      return {source:"Store",asin:"",title:"",page,traffic,sales,units,action:"Migliora hero, ordine prodotti e promessa della pagina Store."};
    });
    return fromBusiness.concat(fromStore)
      .filter(r=>r.traffic>=20 && (r.sales||0)===0 && (r.units||0)===0)
      .sort((a,b)=>(b.traffic||0)-(a.traffic||0))
      .slice(0,20);
  },
  salesRecovery(samples,c,counts){
    const rules=BBUtils.rules();
    const mode=rules.fulfillmentMode || "merchant";
    const isFbaMode=mode==="fba";
    const isHybridMode=mode==="hybrid";
    const logisticsLabel=isFbaMode?"FBA":(isHybridMode?"Ibrido":"Produzione su ordine");
    const timeline=this.salesTimelineRows(samples);
    const latest=timeline.length?timeline[timeline.length-1]:null;
    const salesDays=timeline.filter(r=>(r.sales||0)>0 || (r.units||0)>0);
    const lastSale=salesDays.length?salesDays[salesDays.length-1]:null;
    const today=latest?.date || new Date();
    const daysWithoutSales=lastSale ? Math.max(0,Math.round((today-lastSale.date)/86400000)) : null;
    const since30=new Date(today.getFullYear(),today.getMonth(),today.getDate()-30);
    const last30=timeline.filter(r=>r.date>=since30);
    const trafficLast30=last30.reduce((a,r)=>a+(r.traffic||0),0);
    const salesLast30=last30.reduce((a,r)=>a+(r.sales||0),0);
    const unitsLast30=last30.reduce((a,r)=>a+(r.units||0),0);

    const inv=this.inventoryRows(samples);
    const asin=this.asinDecisionRows(samples);
    const outOfStock=inv.filter(r=>(r.quantity||0)<=0);
    const lowStock=inv.filter(r=>(r.quantity||0)>0 && (r.quantity||0)<=5);
    const topOutOfStock=asin.filter(r=>(r.stock!==null && r.stock<=0) && ((r.sales||0)>0 || (r.units||0)>0 || (r.profit||0)>0)).slice(0,10);
    const weeklyCapacity=BBUtils.num(rules.weeklyProductionCapacity);
    const handlingDays=BBUtils.num(rules.handlingDays);
    const capacityRisk=weeklyCapacity>0 && unitsLast30>weeklyCapacity;
    const handlingRisk=handlingDays>3;

    const featured=this.featuredOfferRows(samples);
    const featuredLatest=featured.length?featured[featured.length-1]:null;
    const featuredAvg=featured.length?featured.reduce((a,r)=>a+r.value,0)/featured.length:NaN;
    const featuredMin=featured.length?Math.min(...featured.map(r=>r.value)):NaN;
    let featuredStatus="unknown";
    if(featuredLatest){
      featuredStatus=featuredLatest.value<85?"critical":(featuredLatest.value<95?"warning":"ok");
    }

    const zeroTraffic=this.trafficNoSalesRows(samples);
    const actions=[];
    if(daysWithoutSales!==null && daysWithoutSales>=7){
      actions.push({area:"Vendite",type:"red",priority:1,title:"Periodo senza vendite",item:daysWithoutSales+" giorni",why:"Ultima vendita rilevata il "+lastSale.date.toLocaleDateString("it-IT")+".",action:"Controlla subito acquistabilità dell'offerta, Featured Offer, prezzo e listing con traffico."});
    }
    if(isFbaMode && (topOutOfStock.length || outOfStock.length)){
      actions.push({area:"Inventario",type:"red",priority:1,title:"Ripristina stock FBA",item:(topOutOfStock.length||outOfStock.length)+" prodotti critici",why:"In modello FBA, prodotti con stock zero possono bloccare vendite e Featured Offer.",action:"Verifica spedizioni FBA in arrivo, inventario bloccato e rifornimento dei top seller."});
    }else if((!isFbaMode) && (topOutOfStock.length || outOfStock.length)){
      actions.push({area:"Offerta",type:"yellow",priority:2,title:"Verifica acquistabilità FBM",item:(topOutOfStock.length||outOfStock.length)+" prodotti con quantita' zero",why:"Nel tuo modello produci su ordine: stock fisico zero va bene, ma su Amazon l'offerta deve risultare acquistabile.",action:"Controlla quantita' offerta, tempi di preparazione, template spedizione e prodotti non attivi/bloccati."});
    }
    if(capacityRisk){
      actions.push({area:"Produzione",type:"yellow",priority:2,title:"Capacita' produttiva da controllare",item:unitsLast30+" unita' negli ultimi 30 giorni",why:"Le vendite recenti superano la capacita' settimanale impostata nel Setup.",action:"Aumenta capacita', allunga tempi realistici o crea mini stock solo sui top seller."});
    }
    if(handlingRisk){
      actions.push({area:"Spedizione",type:"yellow",priority:2,title:"Tempi di preparazione alti",item:handlingDays+" giorni",why:"Tempi lunghi possono ridurre conversione e Featured Offer rispetto a offerte piu' rapide.",action:"Valuta template spedizione piu' chiari, produzione piu' rapida o mini stock sui prodotti vincenti."});
    }
    if(featuredStatus==="critical" || featuredStatus==="warning"){
      actions.push({area:"Featured Offer",type:featuredStatus==="critical"?"red":"yellow",priority:featuredStatus==="critical"?1:2,title:"Recupera Featured Offer",item:BBUtils.pct(featuredLatest.value),why:"Quando scende sotto il 95% perdi visibilita' rispetto ad altri venditori.",action:"Controlla prezzo, disponibilita', tempi spedizione, salute account e competitor."});
    }
    if(zeroTraffic.length){
      actions.push({area:"Conversione",type:"yellow",priority:2,title:"Traffico senza vendite",item:zeroTraffic.length+" elementi",why:"Ci sono ASIN o pagine con visite ma zero ordini.",action:"Migliora immagini, titolo, prezzo, recensioni e coerenza tra keyword e prodotto."});
    }
    if(!actions.length){
      actions.push({area:"Sistema",type:"green",priority:9,title:"Nessun blocco evidente",item:"Controlli recovery",why:"Con i report disponibili non emergono blocchi automatici forti.",action:"Continua monitoraggio e carica Business Report, Inventario e Store ogni martedi."});
    }

    return {
      daysWithoutSales,lastSale,latest,trafficLast30,salesLast30,unitsLast30,
      inventory:{total:inv.length,outOfStock:outOfStock.length,lowStock:lowStock.length,topOutOfStock},
      logistics:{mode,label:logisticsLabel,handlingDays,weeklyCapacity,capacityRisk,handlingRisk},
      featured:{rows:featured,latest:featuredLatest,avg:featuredAvg,min:featuredMin,status:featuredStatus},
      zeroTraffic,
      actions:actions.sort((a,b)=>a.priority-b.priority),
      hasBusinessReport:!!counts?.business_report,
      hasInventory:!!counts?.inventory,
      hasStore:!!(counts?.store_date || counts?.store_live_page),
      checklists:[
        {title:isFbaMode?"Priorita' 1: ripristina stock FBA":"Priorita' 1: offerta acquistabile e producibile",steps:isFbaMode?["Vai in Catena di distribuzione > Spedizioni FBA e verifica spedizioni in arrivo o bloccate.","Controlla inventario bloccato/stranded e risolvi eventuali problemi.","Rifornisci prima i top seller e gli ASIN con traffico ma stock zero."]:["Controlla che i prodotti risultino acquistabili anche se li produci su ordine.","Verifica tempi di preparazione, template spedizione e quantita' offerta su Amazon.","Tieni mini stock solo sui 3-5 top seller se i dati mostrano domanda stabile."]},
        {title:"Priorita' 2: recupera Featured Offer",steps:["Confronta prezzo e consegna con i competitor sugli ASIN principali.","Mantieni tempi di preparazione e spedizione realistici ma rapidi.","Se la Featured Offer scende sotto 85%, agisci prima di aumentare Ads."]},
        {title:"Priorita' 3: ottimizza listing con traffico",steps:["Aggiorna immagini principali, infografiche e foto ambientate.","Riscrivi titoli e bullet con keyword precise: adesivi murali bambini, greche cameretta, gift nascita.","Controlla recensioni, varianti, prezzo e coerenza tra annuncio e pagina prodotto."]},
        {title:"Monitoraggio continuo",steps:["Ogni martedi carica Business Report, Inventario, Store, Search Terms, Ads, Profit Report e Ordini.","Controlla giorni senza vendite, Featured Offer, acquistabilita' offerta e traffico senza conversione.","Se resti senza vendite per 7 giorni, apri subito questa sezione."]}
      ]
    };
  },
  trendIdeas(samples,c){
    const strategy=this.productStrategyRows(samples);
    const hasCat=name=>strategy.some(r=>BBUtils.low(r.category).includes(BBUtils.low(name)) && (r.sales>0 || r.visits>0 || r.keywords>0));
    const ideas=[
      {idea:"Mongolfiere vintage soft",target:"Mamme / nuovi genitori",why:"Tema gia' vicino al tuo catalogo e adatto a camerette calme.",format:"Set adesivi + quadro coordinato",palette:"sabbia, cipria, salvia, cacao",trigger:"Se Mongolfiere / viaggio vende o riceve visite",linked:hasCat("Mongolfiere")},
      {idea:"Animali dolci da nanna",target:"Gift nascita / nonni",why:"Facile da regalare, tenero, comprensibile anche da chi non conosce il brand.",format:"Set premium con nome bambino",palette:"beige, crema, verde salvia",trigger:"Se Animali vende o ha buone keyword",linked:hasCat("Animali")},
      {idea:"Greche minimal premium",target:"Mamme che arredano camerette ordinate",why:"Prodotto piu' adulto e decorativo, buono per differenziarti dagli adesivi troppo cartoon.",format:"Bordo murale + mini adesivi coordinati",palette:"terracotta soft, mocha, rosa antico",trigger:"Se Greche murali porta margine o Store",linked:hasCat("Greche")},
      {idea:"Luna, stelle e sogni",target:"Regalo nascita / baby shower",why:"Tema sempreverde, molto adatto a messaggi emozionali e confezione regalo.",format:"Kit nanna: luna + stelle + nome",palette:"blu polvere, avorio, oro tenue",trigger:"Se Stelle / luna vende ma margine e pagina vanno corretti",linked:hasCat("Stelle")},
      {idea:"Safari beige e salvia",target:"Nuovi genitori",why:"Trend caldo/naturale, meno saturo del safari colorato classico.",format:"Set animali soft + crescita coordinata",palette:"sabbia, salvia, ocra chiaro",trigger:"Da testare come nuova linea se Animali ha segnali positivi",linked:hasCat("Animali")},
      {idea:"Quadri coordinati agli adesivi",target:"Gift / nonni",why:"Aumenta valore medio ordine e rende il prodotto piu' regalo.",format:"Bundle quadro + adesivo + biglietto",palette:"coerente con tema vincente",trigger:"Se una categoria vende ma vuoi aumentare ticket medio",linked:strategy.some(r=>r.sales>100)}
    ];
    return ideas.map(i=>({
      ...i,
      decision:i.linked?"Priorita' alta":"Da testare",
      action:i.linked?"Crea 2 varianti e una mini campagna test.":"Prepara mockup e valida con piccolo test Store/Ads."
    }));
  },
  weeklyActionPlan(samples,c,counts){
    const asin=this.asinDecisionRows(samples);
    const keywords=this.keywordRows(samples);
    const store=this.storeInsights(samples,c);
    const trends=this.trendIdeas(samples,c);
    const pick=(rows,n)=>rows.slice(0,n);
    const actions=[];
    const recovery=this.salesRecovery ? this.salesRecovery(samples,c,counts) : null;
    (recovery?.actions||[]).filter(r=>r.type!=="green").slice(0,4).forEach(r=>actions.push({group:"Sales Recovery",priority:r.type==="red"?"Alta":"Media",item:r.title,detail:r.item,why:r.why,action:r.action}));
    pick(asin.filter(r=>r.decision==="scale"),3).forEach(r=>actions.push({group:"Prodotti da spingere",priority:"Alta",item:r.asin,detail:r.title||r.sku,why:"Profitto "+BBUtils.euro(r.profit)+" e margine "+BBUtils.pct(r.margin)+".",action:"Aumenta visibilita', proteggi stock e collega keyword migliori."}));
    pick(asin.filter(r=>r.decision==="fix"),3).forEach(r=>actions.push({group:"Prodotti da correggere",priority:"Alta",item:r.asin,detail:r.title||r.sku,why:"Margine/profitto non convincono.",action:"Rivedi prezzo, formato, costi produzione o Ads prima di spingere."}));
    pick(keywords.filter(r=>r.decision==="scale"),3).forEach(r=>actions.push({group:"Keyword da aumentare",priority:"Media",item:r.term,detail:r.source,why:"Vendite "+BBUtils.euro(r.sales)+" con ACOS "+BBUtils.pct(r.acos)+".",action:"Aumenta offerta con budget controllato."}));
    pick(keywords.filter(r=>r.decision==="cut"),3).forEach(r=>actions.push({group:"Keyword da tagliare",priority:"Alta",item:r.term,detail:r.source,why:"Spesa "+BBUtils.euro(r.spend)+" senza vendite.",action:"Riduci, metti negativa o cambia landing prodotto."}));
    pick(store.pages.filter(r=>r.decision==="Da correggere"),3).forEach(r=>actions.push({group:"Pagine Store da sistemare",priority:"Media",item:r.name,detail:r.kind,why:r.visits+" visite e "+BBUtils.euro(r.sales)+" vendite.",action:r.action}));
    pick(store.categories.filter(r=>r.decision==="Crea varianti"),3).forEach(r=>actions.push({group:"Varianti da creare",priority:"Alta",item:r.category,detail:r.pages||r.products,why:"Categoria validata da vendite/profitto.",action:"Crea 2 nuovi disegni e un bundle gift."}));
    pick(trends.filter(r=>r.decision==="Priorita' alta"),3).forEach(r=>actions.push({group:"Trend da trasformare in prodotto",priority:"Media",item:r.idea,detail:r.target,why:r.why,action:r.action}));
    if(!counts?.store_date || !counts?.store_live_page || !counts?.store_source){
      actions.push({group:"Dati da caricare",priority:"Alta",item:"Report Store Amazon",detail:"date, livePage, notLivePage, source",why:"Servono per capire pagine, fonti traffico e stagionalita'.",action:"Caricali ogni martedi insieme agli altri report."});
    }
    if(!actions.length){
      actions.push({group:"Prossimo passo",priority:"Media",item:"Carica report completi",detail:"Amazon + Store + Ads",why:"Servono piu' dati per generare priorita' affidabili.",action:"Importa i report settimanali e aggiorna la dashboard."});
    }
    const budgetTests=store.categories.filter(r=>["Crea varianti","Spingi test"].includes(r.decision)).slice(0,3).map((r,i)=>({
      test:r.category,
      budget:i===0?"15-25 €":"10-15 €",
      goal:i===0?"validare variante o bundle":"capire se il tema merita nuovi disegni",
      metric:"CTR, vendite, ACOS e visite Store"
    }));
    return {actions:actions.slice(0,24),budgetTests,season:this.seasonalFocus()};
  },
  inventoryRows(samples){
    const rows=samples.inventory||[];
    return rows.map(r=>{
      const sku=BBUtils.pick(r,["seller-sku","SKU","sku"])||"";
      const asin=BBUtils.pick(r,["asin1","ASIN","asin","product-id"])||"";
      const rawTitle=BBUtils.pick(r,["item-name","Title","Titolo","Product Name","Nome prodotto"])||"";
      const title=BBUtils.short(rawTitle,120);
      const price=BBUtils.num(BBUtils.pick(r,["price","Prezzo","Your Price"]));
      const quantity=BBUtils.num(BBUtils.pick(r,["quantity","Quantità","available","fulfillable"]));
      const status=BBUtils.pick(r,["status","Stato"])||"";
      const channel=BBUtils.pick(r,["fulfillment-channel","Fulfillment Channel","Canale"])||"";
      const search=[sku,asin,rawTitle,status,channel].join(" ").toLowerCase();
      return {sku,asin,title,price,quantity,status,channel,search};
    }).filter(x=>x.sku||x.asin||x.title).sort((a,b)=>a.title.localeCompare(b.title)).slice(0,500);
  },
  brandAnalyticsRows(samples){
    const rows=samples.brand_analytics||[];
    return rows.map(r=>{
      const query=BBUtils.pick(r,["Query di ricerca","Search Query","Search term"])||"";
      const volume=BBUtils.num(BBUtils.pick(r,["Volume delle query di ricerca","Search Query Volume","Volume"]));
      const rank=BBUtils.num(BBUtils.pick(r,["Cerca punteggio query","Search Query Score","Punteggio query","Search Query Rank"]));
      const impTotal=BBUtils.num(BBUtils.pick(r,["Impressioni: numero totale","Impressions: Total Count","Impression Count: Total"]));
      const impBrand=BBUtils.num(BBUtils.pick(r,["Impressioni: conteggio marchio","Impressions: Brand Count","Impression Count: Brand"]));
      const brandImpShare=BBUtils.num(BBUtils.pick(r,["Impressioni: % quota del marchio","Impressions: Brand Share %","Impression Share: Brand"]));
      const clickTotal=BBUtils.num(BBUtils.pick(r,["Clic: conteggio totale","Clicks: Total Count","Click Count: Total"]));
      const clickRate=BBUtils.num(BBUtils.pick(r,["Clic: percentuale di clic","Clicks: Click Rate %","Click Rate"]));
      const clickBrand=BBUtils.num(BBUtils.pick(r,["Clic: conteggio marchio","Clicks: Brand Count","Click Count: Brand"]));
      const clickShare=BBUtils.num(BBUtils.pick(r,["Clic: % quota del marchio","Clicks: Brand Share %","Click Share: Brand"]));
      const cartTotal=BBUtils.num(BBUtils.pick(r,["Aggiunte al carrello: conteggio totale","Cart Adds: Total Count","Cart Add Count: Total"]));
      const cartRate=BBUtils.num(BBUtils.pick(r,["Aggiunte al carrello: percentuale","Cart Adds: Cart Add Rate %","Cart Add Rate"]));
      const cartBrand=BBUtils.num(BBUtils.pick(r,["Aggiunte al carrello: conteggio marchio","Cart Adds: Brand Count","Cart Add Count: Brand"]));
      const cartShare=BBUtils.num(BBUtils.pick(r,["Aggiunte al carrello: % quota del marchio","Cart Adds: Brand Share %","Cart Add Share: Brand"]));
      const purchaseTotal=BBUtils.num(BBUtils.pick(r,["Acquisti: conteggio totale","Purchases: Total Count","Purchase Count: Total"]));
      const purchaseRate=BBUtils.num(BBUtils.pick(r,["Acquisti: percentuale di acquisto","Purchases: Purchase Rate %","Purchase Rate"]));
      const purchaseBrand=BBUtils.num(BBUtils.pick(r,["Acquisti: conteggio marchio","Purchases: Brand Count","Purchase Count: Brand"]));
      const purchaseShare=BBUtils.num(BBUtils.pick(r,["Acquisti: % quota del marchio","Purchases: Brand Share %","Purchase Share: Brand"]));
      let decision="Monitora";
      let action="Tieni sotto controllo: utile per capire domanda e linguaggio clienti.";
      if(volume>=100 && brandImpShare<2){
        decision="Grande opportunita";
        action="Crea contenuto/listing o Ads mirata: tanta domanda, poca presenza BipBop.";
      } else if(clickTotal>=20 && purchaseShare<5){
        decision="Ottimizza conversione";
        action="Migliora titolo, immagine, prezzo o variante: arrivano clic ma pochi acquisti del brand.";
      } else if(purchaseShare>=20 || purchaseBrand>=2){
        decision="Proteggi";
        action="Difendi posizione con listing forte, prezzo coerente e campagne controllate.";
      } else if(volume>=20 && clickShare>=20){
        decision="Testa variante";
        action="La query attira interesse: prova un disegno o bundle collegato.";
      }
      return {query,rank,volume,impTotal,impBrand,brandImpShare,clickTotal,clickRate,clickBrand,clickShare,cartTotal,cartRate,cartBrand,cartShare,purchaseTotal,purchaseRate,purchaseBrand,purchaseShare,decision,action};
    }).filter(x=>x.query).sort((a,b)=>b.volume-a.volume).slice(0,100);
  }
,
  profitRows(samples){
    const rows=samples.profit_report||[];
    const titles=this.productTitleMap(samples);
    const map=new Map();
    rows.forEach(r=>{
      const asin=BBUtils.pick(r,["ASIN","asin"])||"N/D";
      const sku=BBUtils.pick(r,["MSKU","sku","SKU"])||"";
      const year=this.rowYear(r);
      const key=[year,asin,sku].join("|");
      const o=map.get(key)||{year,asin,sku,title:titles.get(asin)||"",sales:0,units:0,profit:0,margin:NaN,latestDate:null};
      o.title=o.title||titles.get(asin)||"";
      const rowDate=this.rowDate(r);
      if(rowDate && (!o.latestDate || rowDate>o.latestDate)) o.latestDate=rowDate;
      const sales=BBUtils.num(BBUtils.pick(r,["Vendite nette","Vendite","Net sales","Sales"]));
      const units=BBUtils.num(BBUtils.pick(r,["Unità nette vendute","Unità vendute","Units sold","Net units sold"]));
      const profit=BBUtils.num(BBUtils.pick(r,["Totale: Ricavi netti","Ricavi netti","Utile netto","Profitto netto","Net profit","Profit"]));
      o.sales+=sales;
      o.units+=units;
      o.profit+=profit;
      o.margin=o.sales?o.profit/o.sales*100:NaN;
      map.set(key,o);
    });
    return Array.from(map.values()).filter(r=>r.asin!=="N/D" || r.sales || r.profit).sort((a,b)=>b.sales-a.sales).slice(0,300);
  },
  profitYearRows(samples){
    const rows=this.profitRows(samples), map=new Map();
    rows.forEach(r=>{
      const o=map.get(r.year)||{year:r.year,sales:0,units:0,profit:0,margin:NaN,asinCount:0};
      o.sales+=r.sales;
      o.units+=r.units;
      o.profit+=r.profit;
      o.asinCount+=1;
      o.margin=o.sales?o.profit/o.sales*100:NaN;
      map.set(r.year,o);
    });
    return Array.from(map.values()).sort((a,b)=>String(a.year).localeCompare(String(b.year)));
  },
  asinDecisionRows(samples){
    const map=new Map();
    const titles=this.productTitleMap(samples);
    const ensure=(asin,sku="",title="")=>{
      title=title||titles.get(asin)||"";
      const key=asin||sku||title||"N/D";
      const o=map.get(key)||{asin:asin||"N/D",sku,title,sales:0,units:0,profit:0,margin:NaN,stock:null,status:"",source:new Set()};
      if(sku && !o.sku) o.sku=sku;
      if(title && !o.title) o.title=title;
      map.set(key,o);
      return o;
    };

    (samples.orders||[]).forEach(r=>{
      const asin=BBUtils.pick(r,["asin","ASIN","product-id","Product ID"])||"N/D";
      const sku=BBUtils.pick(r,["sku","seller-sku","SKU"])||"";
      const title=BBUtils.pick(r,["product-name","Product Name","item-name","Titolo","Title"])||"";
      const o=ensure(asin,sku,title);
      o.sales+=BBUtils.num(BBUtils.pick(r,["item-price","Item Price","Prezzo articolo","Prezzo dell'articolo","product-sales","Product Sales"]));
      o.units+=BBUtils.num(BBUtils.pick(r,["quantity-purchased","Quantity","Quantità","quantity"]));
      o.source.add("Ordini");
    });

    (samples.profit_report||[]).forEach(r=>{
      const asin=BBUtils.pick(r,["ASIN","asin"])||"N/D";
      const sku=BBUtils.pick(r,["MSKU","sku","SKU"])||"";
      const o=ensure(asin,sku,titles.get(asin)||"");
      o.sales+=BBUtils.num(BBUtils.pick(r,["Vendite nette","Vendite","Net sales","Sales"]));
      o.units+=BBUtils.num(BBUtils.pick(r,["Unità nette vendute","Unità vendute","Units sold","Net units sold"]));
      o.profit+=BBUtils.num(BBUtils.pick(r,["Totale: Ricavi netti","Ricavi netti","Utile netto","Profitto netto","Net profit","Profit"]));
      o.source.add("Profit Report");
    });

    (samples.inventory||[]).forEach(r=>{
      const asin=BBUtils.pick(r,["asin1","ASIN","asin","product-id"])||"N/D";
      const sku=BBUtils.pick(r,["seller-sku","SKU","sku"])||"";
      const title=BBUtils.short(BBUtils.pick(r,["item-name","Title","Titolo","Product Name","Nome prodotto"])||"",90);
      const o=ensure(asin,sku,title);
      o.stock=BBUtils.num(BBUtils.pick(r,["quantity","Quantità","available","fulfillable"]));
      o.status=BBUtils.pick(r,["status","Stato"])||"";
      o.source.add("Inventario");
    });

    return Array.from(map.values()).map(o=>{
      o.margin=o.sales?o.profit/o.sales*100:NaN;
      let decision="watch", action="Monitora";
      if((o.stock!==null && o.stock<=0) && (o.sales>0 || o.units>0)){
        decision="stock"; action="Controlla stock prima di spingere";
      }else if(o.profit<0){
        decision="fix"; action="Correggi costi/prezzo/ads";
      }else if(o.sales>=100 && Number.isFinite(o.margin) && o.margin>=40 && (o.stock===null || o.stock>10)){
        decision="scale"; action="Spingi con keyword e budget";
      }else if(o.sales>0 && Number.isFinite(o.margin) && o.margin>=25){
        decision="protect"; action="Proteggi ranking e stock";
      }else if(o.sales>0 && Number.isFinite(o.margin) && o.margin<25){
        decision="fix"; action="Migliora margine o prezzo";
      }
      o.decision=decision;
      o.action=action;
      o.search=[o.asin,o.sku,o.title].join(" ").toLowerCase();
      o.source=Array.from(o.source).join(", ");
      return o;
    }).filter(o=>o.asin!=="N/D" || o.sku || o.sales || o.profit).sort((a,b)=>(b.profit||0)-(a.profit||0)).slice(0,300);
  },
  competitorRows(samples,c){
    const rules=BBUtils.rules();
    const avgAmazonPrice=Number.isFinite(c.avgPrice) ? c.avgPrice : 0;
    const handlingDays=BBUtils.num(rules.handlingDays);
    const competitors=(rules.competitors||[]).map((raw,i)=>{
      const name=String(raw.name||"Competitor "+(i+1)).trim();
      const domain=String(raw.domain||"").trim();
      const type=raw.type||"site";
      const price=BBUtils.num(raw.price);
      const shipping=BBUtils.num(raw.shipping);
      const deliveryDays=BBUtils.num(raw.deliveryDays);
      const reviews=BBUtils.num(raw.reviews);
      const rating=BBUtils.num(raw.rating);
      const bsr=BBUtils.num(raw.bsr);
      const monthlySales=BBUtils.num(raw.monthlySales);
      const totalPrice=price+shipping;
      const priceGap=totalPrice && avgAmazonPrice ? totalPrice-avgAmazonPrice : NaN;
      const deliveryGap=deliveryDays && handlingDays ? deliveryDays-handlingDays : NaN;
      const isOwn=type==="shopify" || BBUtils.low(domain).includes("bipbopstickers.it");
      const strengths=String(raw.strengths||"").trim();
      const weaknesses=String(raw.weaknesses||"").trim();
      const notes=String(raw.notes||"").trim();
      const productType=String(raw.productType||raw.category||"Generale").trim();
      const demandScore=Math.min(100,
        (monthlySales?Math.min(monthlySales,300)/3:0)+
        (reviews?Math.min(reviews,1000)/20:0)+
        (rating>=4.4?15:(rating>=4?8:0))+
        (bsr?Math.max(0,30-Math.min(bsr,30000)/1000):0)
      );
      const estimatedDemand=monthlySales?monthlySales+" vendite/mese dichiarate":(demandScore>=65?"Domanda alta stimata":(demandScore>=35?"Domanda media stimata":(demandScore>0?"Domanda debole da verificare":"Domanda non stimabile")));
      let decision="Da osservare";
      let action="Completa prezzo, recensioni/rating e segnali vendita per capire se creare un prodotto simile.";
      let priority=5;
      if(isOwn){
        decision="Da spingere Shopify";
        action="Crea bundle esclusivi, varianti personalizzate e pagine SEO per nuovi genitori, mamme, nonni e gift.";
        priority=2;
      }else if(demandScore>=65 && totalPrice>=15){
        decision="Crea articolo simile";
        action="Prodotto con domanda forte: crea una versione BipBop differenziata per stile, qualita, bundle o personalizzazione.";
        priority=1;
      }else if(demandScore>=35){
        decision="Testa variante";
        action="Domanda interessante: crea una variante leggera o mockup e validala con Ads/Shopify prima di produrre troppo.";
        priority=2;
      }else if(totalPrice && avgAmazonPrice && totalPrice<avgAmazonPrice*0.9){
        decision="Competitor prezzo";
        action="Non copiare al ribasso: valuta bundle, formato piu ricco o promo Shopify mirata.";
        priority=1;
      }else if(deliveryDays && handlingDays && deliveryDays<handlingDays){
        decision="Competitor consegna";
        action="Migliora promessa di consegna o crea mini stock solo sui top seller.";
        priority=2;
      }else if(domain && !totalPrice && !deliveryDays && !reviews && !rating && !bsr && !monthlySales && !strengths && !weaknesses && !notes){
        decision="Dati da completare";
        action="Inserisci almeno prezzo, recensioni/rating o venduti nell'ultimo mese: poi calcolo domanda stimata e azione.";
        priority=1;
      }else if(BBUtils.low(strengths+" "+notes).match(/personal|nome|regalo|gift|bundle|premium/)){
        decision="Idea da copiare meglio";
        action="Trasforma il punto forte in variante BipBop: regalo nascita, nome bambino, set coordinato o bundle.";
        priority=3;
      }else if(totalPrice || domain){
        decision="Benchmark utile";
        action="Usalo come riferimento per prezzo, promessa, immagini e garanzie.";
        priority=4;
      }
      return {
        id:raw.id||String(i),
        name,domain,type,
        category:raw.category||"Generale",
        productType,
        price,shipping,deliveryDays,totalPrice,priceGap,deliveryGap,
        reviews,rating,bsr,monthlySales,demandScore,estimatedDemand,
        strengths,weaknesses,notes,isOwn,decision,action,priority,
        search:[name,domain,raw.category,productType,strengths,weaknesses,notes,type].join(" ").toLowerCase()
      };
    });
    return competitors.sort((a,b)=>a.priority-b.priority || (a.totalPrice||999999)-(b.totalPrice||999999));
  },
  competitorSummary(samples,c){
    const rows=this.competitorRows(samples,c);
    const priced=rows.filter(r=>r.totalPrice>0);
    const avgCompetitor=priced.length?priced.reduce((a,r)=>a+r.totalPrice,0)/priced.length:NaN;
    const fastest=rows.filter(r=>r.deliveryDays>0).sort((a,b)=>a.deliveryDays-b.deliveryDays)[0]||null;
    const cheapest=priced.sort((a,b)=>a.totalPrice-b.totalPrice)[0]||null;
    const bestDemand=rows.filter(r=>!r.isOwn && r.demandScore>0).sort((a,b)=>b.demandScore-a.demandScore)[0]||null;
    const own=rows.find(r=>r.isOwn)||null;
    const opportunities=[];
    if(own) opportunities.push({title:"Spingi il sito proprietario",why:"Su Shopify puoi costruire relazione diretta, bundle e personalizzazioni senza dipendere solo da Amazon.",action:"Crea una landing per gift nascita e una per camerette con set coordinati."});
    if(cheapest && !cheapest.isOwn) opportunities.push({title:"Controlla competitor economico",why:cheapest.name+" ha prezzo totale "+BBUtils.euro(cheapest.totalPrice)+".",action:"Difenditi con valore percepito: bundle, materiali, immagini, garanzia e consegna chiara."});
    if(fastest && !fastest.isOwn) opportunities.push({title:"Controlla competitor rapido",why:fastest.name+" dichiara "+fastest.deliveryDays+" giorni.",action:"Se perdi conversioni, riduci tempi dichiarati solo dove riesci davvero a produrre e spedire."});
    if(bestDemand) opportunities.push({title:"Prodotto competitor promettente",why:bestDemand.name+" ha punteggio domanda "+Math.round(bestDemand.demandScore)+"/100.",action:"Valuta un articolo simile ma differenziato: non copia, ma variante BipBop con stile, bundle o personalizzazione."});
    if(!rows.length) opportunities.push({title:"Aggiungi competitor",why:"Senza benchmark non possiamo capire prezzo, consegna e posizionamento.",action:"Inserisci almeno 3 competitor: uno Amazon, uno Shopify/sito esterno e uno specializzato in camerette."});
    return {
      rows,
      avgAmazonPrice:Number.isFinite(c.avgPrice)?c.avgPrice:NaN,
      avgCompetitor,
      cheapest,
      fastest,
      bestDemand,
      own,
      opportunities
    };
  },
  decisionRows(samples,counts){
    const out=[];
    const recovery=this.salesRecovery ? this.salesRecovery(samples,this.calc(samples),counts) : null;
    (recovery?.actions||[]).filter(r=>r.type!=="green").forEach(r=>{
      out.push({area:"Recovery",priority:r.priority||1,type:r.type,title:r.title,item:r.item,why:r.why,action:r.action});
    });
    this.asinDecisionRows(samples).forEach(r=>{
      if(r.decision==="fix"){
        out.push({area:"ASIN",priority:1,type:"red",title:"Correggi ASIN in perdita",item:r.asin,itemTitle:r.title,why:"Profitto "+BBUtils.euro(r.profit)+" su vendite "+BBUtils.euro(r.sales)+".",action:r.action});
      }else if(r.decision==="stock"){
        out.push({area:"Inventario",priority:2,type:"yellow",title:"Stock blocca crescita",item:r.asin,itemTitle:r.title,why:"ASIN con vendite/profitto ma stock a "+r.stock+".",action:r.action});
      }else if(r.decision==="scale"){
        out.push({area:"ASIN",priority:3,type:"green",title:"Spingi ASIN profittevole",item:r.asin,itemTitle:r.title,why:"Profitto "+BBUtils.euro(r.profit)+" e margine "+BBUtils.pct(r.margin)+".",action:r.action});
      }
    });
    this.keywordRows(samples).forEach(r=>{
      if(r.decision==="cut"){
        out.push({area:"Keyword",priority:1,type:"red",title:"Taglia keyword che spreca",item:r.term,why:"Spesa "+BBUtils.euro(r.spend)+" senza vendite.",action:r.action});
      }else if(r.decision==="scale"){
        out.push({area:"Keyword",priority:3,type:"green",title:"Spingi keyword profittevole",item:r.term,why:"Vendite "+BBUtils.euro(r.sales)+", ACOS "+BBUtils.pct(r.acos)+".",action:r.action});
      }else if(r.decision==="optimize"){
        out.push({area:"Keyword",priority:2,type:"yellow",title:"Ottimizza keyword costosa",item:r.term,why:"Vendite presenti ma ACOS "+BBUtils.pct(r.acos)+".",action:r.action});
      }
    });
    this.storeInsights(samples,this.calc(samples)).categories.forEach(r=>{
      if(r.decision==="Crea varianti"){
        out.push({area:"Prodotto",priority:3,type:"green",title:"Crea nuove varianti",item:r.category,why:"Categoria con vendite/profitto: "+BBUtils.euro(r.sales)+" vendite e "+BBUtils.euro(r.profit)+" profitto.",action:r.action});
      }else if(r.decision==="Rifai pagina"){
        out.push({area:"Store",priority:2,type:"yellow",title:"Pagina Store da correggere",item:r.category,why:"Traffico presente ("+r.visits+" visite) ma ordini bassi o assenti.",action:r.action});
      }else if(r.decision==="Spingi test"){
        out.push({area:"Prodotto",priority:3,type:"green",title:"Testa categoria promettente",item:r.category,why:"Segnali positivi da vendite Store, keyword o Profit Report.",action:r.action});
      }
    });
    this.competitorSummary(samples,this.calc(samples)).opportunities.slice(0,4).forEach(r=>{
      out.push({area:"Competitor",priority:3,type:r.title.includes("Controlla")?"yellow":"green",title:r.title,item:"Benchmark mercato",why:r.why,action:r.action});
    });
    if(!counts?.business_report) out.push({area:"Dati",priority:4,type:"yellow",title:"Manca Business Report",item:"Sessioni e conversione",why:"Serve per capire traffico e conversione per ASIN.",action:"Carica Sales and Traffic by Child Item quando lo trovi."});
    if(!counts?.store_date && !counts?.store_live_page) out.push({area:"Dati",priority:4,type:"yellow",title:"Mancano dati Store",item:"Store Amazon",why:"Servono per capire se conviene creare varianti, greche, quadri o adesivi murali.",action:"Carica Store date, livePage, source e notLivePage."});
    if(!out.length) out.push({area:"Sistema",priority:9,type:"green",title:"Nessuna urgenza critica",item:"Base dati",why:"I dati caricati non evidenziano blocchi prioritari.",action:"Continua monitoraggio e importa altri report."});
    return out.sort((a,b)=>a.priority-b.priority).slice(0,30);
  }

};
