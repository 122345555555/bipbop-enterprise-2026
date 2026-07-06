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
    ["brand_analytics","Brand Analytics","consigliato"]
  ],
  label(type){ const r=this.reportDefs.find(x=>x[0]===type); return r?r[1]:type; },
  calc(samples){
    const br=samples.business_report||[], tx=samples.transactions||[], inv=samples.ad_invoices||[];
    const adsRows=[...(samples.sponsored_products||[]),...(samples.sponsored_brands||[]),...(samples.sponsored_display||[])];
    const orders=samples.orders||[];

    const salesBR=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Ordered Product Sales","Vendite prodotto ordinate","Sales","Vendite"])),0);
    const salesTX=tx.reduce((a,r)=>a+Math.max(BBUtils.num(BBUtils.pick(r,["Totale (EUR)","Total (EUR)","Total","Totale"])),0),0);
    const sales=salesBR||salesTX;

    const units=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Units Ordered","Unità ordinate","Units","Quantità"])),0)||
      orders.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["quantity-purchased","Quantity","Quantità"])),0);
    const sessions=br.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Sessions","Sessioni"])),0);

    const amazonFees=tx.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Commissioni Amazon","Amazon fees","commissioni"])),0);
    const adsInvoice=inv.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Importo pagato (convertito)","Paid Amount","Amount Paid","Totale","Total","Importo"])),0);
    const adsSpend=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Spend","Spesa","Cost","Costo","Costo totale"])),0);
    const adsSales=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Sales","Vendite","7 Day Total Sales","14 Day Total Sales"])),0);
    const clicks=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Clicks","Clic","Click"])),0);
    const impressions=adsRows.reduce((a,r)=>a+BBUtils.num(BBUtils.pick(r,["Impressions","Impressioni","Viewable impressions","Impressioni visualizzabili"])),0);
    const ads=adsInvoice||adsSpend;
    const profit=sales+amazonFees-ads;

    return {
      sales,units,sessions,amazonFees,ads,adsSales,clicks,impressions,profit,
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
    const br=samples.business_report||[], tx=samples.transactions||[], map=new Map();
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
    return Array.from(map.values()).sort((a,b)=>b.sales-a.sales).slice(0,100);
  },
  keywordRows(samples){
    const st=samples.search_terms||[];
    return st.map(r=>{
      const term=BBUtils.pick(r,["Customer Search Term","Search Term","Termine di ricerca","Keyword","Parola chiave"])||"";
      const spend=BBUtils.num(BBUtils.pick(r,["Spend","Spesa","Cost","Costo","Costo totale"]));
      const sales=BBUtils.num(BBUtils.pick(r,["Sales","Vendite","7 Day Total Sales","14 Day Total Sales"]));
      const clicks=BBUtils.num(BBUtils.pick(r,["Clicks","Clic","Click"]));
      return {term,spend,sales,clicks,acos:sales?spend/sales*100:NaN,roas:spend?sales/spend:NaN};
    }).filter(x=>x.term).sort((a,b)=>b.spend-a.spend).slice(0,100);
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
      return {sku,asin,title,price,quantity,status,channel};
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

};
