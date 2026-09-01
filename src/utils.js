window.BBUtils = {
  el(id){ return document.getElementById(id); },
  low(s){ return String(s || "").toLowerCase().trim(); },
  flat(s){ return String(s || "").toLowerCase().replace(/[_\-]+/g," ").trim(); },
  euro(v){ return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v || 0)); },
  num(v){
    if(v===null || v===undefined || v==="") return 0;
    let s=String(v).replace(/\u00a0/g," ").replace(/[€$£%]/g,"").replace(/\s/g,"").trim();
    const negative=/^\(.*\)$/.test(s);
    s=s.replace(/[()]/g,"");
    const comma=s.lastIndexOf(","),dot=s.lastIndexOf(".");
    if(comma>=0 && dot>=0){
      // L'ultimo separatore è quello decimale: supporta sia 4.041,92
      // sia 4,041.92 senza scambiare migliaia e centesimi.
      if(comma>dot) s=s.replace(/\./g,"").replace(",",".");
      else s=s.replace(/,/g,"");
    }else if(comma>=0){
      const parts=s.split(",");
      const looksThousands=parts.length===2 && /^\d{1,3}$/.test(parts[0]) &&
        /^\d{3}$/.test(parts[1]) && Number(parts[0])!==0;
      s=looksThousands?s.replace(",",""):s.replace(",",".");
    }
    const m=s.match(/-?\d+(\.\d+)?/);
    const n=m ? Number(m[0]) : 0;
    return negative ? -Math.abs(n) : n;
  },
  pct(v){ return Number.isFinite(v) ? v.toFixed(1)+"%" : "—"; },
  todayISO(){
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  },
  parseDate(value){
    const s=String(value || "").trim();
    if(!s) return "";
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return `${m[1]}-${m[2]}-${m[3]}`;
    m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if(m) return `${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
    return s;
  },
  dateIT(value){
    const s=String(value || "").trim();
    if(!s) return "—";
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return `${m[3]}/${m[2]}/${m[1]}`;
    m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if(m) return `${String(m[1]).padStart(2,"0")}/${String(m[2]).padStart(2,"0")}/${m[3]}`;
    const d=value instanceof Date ? value : new Date(s);
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("it-IT");
  },
  dateTimeIT(value){
    if(!value) return "—";
    const d=value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("it-IT",{dateStyle:"short",timeStyle:"short"});
  },
  weeklyImportStatus(files,now=new Date()){
    const current=now instanceof Date ? new Date(now) : new Date(now);
    const cutoff=new Date(current);
    cutoff.setHours(0,0,0,0);
    cutoff.setDate(cutoff.getDate()-((cutoff.getDay()-2+7)%7));
    const active=(files||[])
      .filter(file=>!file.is_duplicate && file.imported_at)
      .map(file=>new Date(file.imported_at))
      .filter(date=>!Number.isNaN(date.getTime()))
      .sort((a,b)=>b-a);
    const latest=active[0]||null;
    return {
      fresh:!!latest && latest>=cutoff,
      latest,
      cutoff
    };
  },
  html(value){
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[ch]));
  },
  short(value,max=120){
    const s=String(value ?? "").replace(/\s+/g," ").trim();
    return s.length>max ? s.slice(0,max-1).trim()+"…" : s;
  },
  pick(row,names){
    const keys=Object.keys(row||{});
    for(const name of names){
      const found=keys.find(k=>this.low(k)===this.low(name));
      if(found && row[found]!=="" && row[found]!==null && row[found]!==undefined) return row[found];
    }
    for(const name of names){
      const found=keys.find(k=>this.low(k).includes(this.low(name)));
      if(found && row[found]!=="" && row[found]!==null && row[found]!==undefined) return row[found];
    }
    return "";
  },
  async sha256(text){
    const data=new TextEncoder().encode(text);
    const hash=await crypto.subtle.digest("SHA-256",data);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
  },
  defaultRules(){
    const defaultProductCosts={
      greche:{label:"Greche murali",salePrice:0,amazonCommission:8,adhesive:0,ink:0,packaging:0,shipping:0},
      adesivi:{label:"Adesivi murali",salePrice:0,amazonCommission:8,adhesive:0,ink:0,packaging:0,shipping:0},
      quadri:{label:"Quadri",salePrice:0,amazonCommission:8,adhesive:0,ink:0,packaging:0,shipping:0},
      bundle:{label:"Bundle / set premium",salePrice:0,amazonCommission:8,adhesive:0,ink:0,packaging:0,shipping:0},
      altro:{label:"Altro",salePrice:0,amazonCommission:8,adhesive:0,ink:0,packaging:0,shipping:0}
    };
    const defaultCompetitors=[
      {
        id:"bipbop-shopify",
        name:"BipBop Shopify",
        domain:"bipbopstickers.it",
        type:"shopify",
        category:"Tutto il catalogo",
        productType:"Canale proprietario",
        price:0,
        shipping:0,
        deliveryDays:0,
        reviews:0,
        rating:0,
        bsr:0,
        monthlySales:0,
        strengths:"Canale proprietario, bundle esclusivi, margine migliore, relazione diretta con clienti.",
        weaknesses:"Serve traffico esterno e fiducia fuori da Amazon.",
        notes:"Usalo per offerte regalo, personalizzazioni e contenuti SEO."
      }
    ];
    return {tacos:15,acos:35,margin:25,monthlyFee:39,subscriptionMonths:18,productionCostPerUnit:0,shippingCostPerUnit:0,extraFixedCosts:0,fulfillmentMode:"merchant",handlingDays:2,weeklyProductionCapacity:30,productCosts:defaultProductCosts,competitors:defaultCompetitors,manualSales:[],fbaItems:[]};
  },
  localRulesFallback(){
    // v1.4.0: nessun dato operativo viene più letto dal browser.
    // I valori predefiniti esistono solo in memoria finché Supabase non viene caricato.
    return this.defaultRules();
  },
  rules(){
    return window.BBCloudRules ? window.BBCloudRules.current() : this.defaultRules();
  }
};
