window.BBUtils = {
  el(id){ return document.getElementById(id); },
  low(s){ return String(s || "").toLowerCase().trim(); },
  flat(s){ return String(s || "").toLowerCase().replace(/[_\-]+/g," ").trim(); },
  euro(v){ return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v || 0)); },
  num(v){
    if(v===null || v===undefined || v==="") return 0;
    let s=String(v).replace(/\u00a0/g," ").replace(/€/g,"").replace(/\s/g,"").trim();
    if(s.includes(",") && s.includes(".")) s=s.replace(/\./g,"").replace(",",".");
    else if(s.includes(",")) s=s.replace(",",".");
    const m=s.match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : 0;
  },
  pct(v){ return Number.isFinite(v) ? v.toFixed(1)+"%" : "—"; },
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
  rules(){
    const defaults={tacos:15,acos:35,margin:25,monthlyFee:39,subscriptionMonths:18};
    try { return {...defaults,...JSON.parse(localStorage.getItem(window.BIPBOP_CONFIG.rulesKey) || "{}")}; }
    catch(e){ return defaults; }
  }
};
