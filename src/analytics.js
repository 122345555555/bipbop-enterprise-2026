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
    const adsRows=[...(samples.sponsored_products||[]),...(samples.sponsored_brands||[]),...(samples.sponsored_display||[])];
    const orders=samples.orders||[];

    const salesBR=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Ordered Product Sales","Vendite prodotto ordinate","Sales","Vendite"])),0);
    const salesTX=tx.reduce((a,r)=>a+Math.max(BBUtils.num(BBUtils.pick(r,["Totale (EUR)","Total (EUR)","Total","Totale"])),0),0);
    const salesOrders=orders.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,[
      "item-price","Item Price","Prezzo articolo","Prezzo dell'articolo",
      "product-sales","Product Sales","Vendite prodotto","order-item-value"
    ])),0);
    const salesProfit=profitRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Vendite nette","Vendite","Net sales","Sales"])),0);
    const sales=salesBR||salesTX||salesOrders||salesProfit;

    const units=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Units Ordered","Unità ordinate","Units","Quantità"])),0)||
      orders.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["quantity-purchased","Quantity","Quantità"])),0);
    const sessions=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Sessions","Sessioni"])),0);

    const amazonFeesTX=tx.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Commissioni Amazon","Amazon fees","commissioni"])),0);
    const amazonFeesProfit=profitRows.reduce((a,r)=>{
      const cols=Object.keys(r||{}).filter(k=>BBUtils.low(k).startsWith("totale:"));
      return a+cols.reduce((s,k)=>s+Math.abs(BBUtils.num(r[k])),0);
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
    const rules=BBUtils.rules();
    const subscriptionCost=BBUtils.num(rules.monthlyFee)*BBUtils.num(rules.subscriptionMonths);
    const adsExtra=netProfitReport ? Math.max(ads-adsProfitReport,0) : ads;
    const reconciledProfit=(netProfitReport||profit)-adsExtra-subscriptionCost;
    const conservativeProfit=(netProfitReport||profit)-ads-subscriptionCost;

    return {
      sales,salesBR,salesTX,salesOrders,salesProfit,units,sessions,amazonFees,amazonFeesTX,amazonFeesProfit,ads,adsProfitReport,adsExtra,adsSales,clicks,impressions,profit,netProfitReport,subscriptionCost,reconciledProfit,conservativeProfit,
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
      o.sales+=BBUtils.num(BBUtils.pick(r,["Ordered Product Sales","Sales","Vendite prodotto ordinate","Vendite"]));
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
      o.sales+=Math.max(BBUtils.num(BBUtils.pick(r,["Totale (EUR)","Total (EUR)","Totale"])),0);
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
    return map;
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
        units:0
      };
      o.source.add(item.source);
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
      const impTotal=BBUtils.num(BBUtils.pick(r,["Impressioni: numero totale","Impressions: Total Count"]));
      const brandImpShare=BBUtils.num(BBUtils.pick(r,["Impressioni: % quota del marchio","Impressions: Brand Share %"]));
      const clickShare=BBUtils.num(BBUtils.pick(r,["Clic: % quota del marchio","Clicks: Brand Share %"]));
      const purchaseShare=BBUtils.num(BBUtils.pick(r,["Acquisti: % quota del marchio","Purchases: Brand Share %"]));
      return {query,volume,impTotal,brandImpShare,clickShare,purchaseShare};
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
      const o=map.get(key)||{year,asin,sku,title:titles.get(asin)||"",sales:0,units:0,profit:0,margin:NaN};
      o.title=o.title||titles.get(asin)||"";
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
  decisionRows(samples,counts){
    const out=[];
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
    if(!counts?.business_report?.activeRows) out.push({area:"Dati",priority:4,type:"yellow",title:"Manca Business Report",item:"Sessioni e conversione",why:"Serve per capire traffico e conversione per ASIN.",action:"Carica Sales and Traffic by Child Item quando lo trovi."});
    if(!out.length) out.push({area:"Sistema",priority:9,type:"green",title:"Nessuna urgenza critica",item:"Base dati",why:"I dati caricati non evidenziano blocchi prioritari.",action:"Continua monitoraggio e importa altri report."});
    return out.sort((a,b)=>a.priority-b.priority).slice(0,30);
  }

};
