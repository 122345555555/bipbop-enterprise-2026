window.BBParser = {
  decodeArrayBuffer(buffer){
    const bytes=new Uint8Array(buffer);
    if(bytes.length>=2 && bytes[0]===255 && bytes[1]===254) return new TextDecoder("utf-16le").decode(buffer);
    if(bytes.length>=2 && bytes[0]===254 && bytes[1]===255) return new TextDecoder("utf-16be").decode(buffer);
    if(bytes.length>=3 && bytes[0]===239 && bytes[1]===187 && bytes[2]===191) return new TextDecoder("utf-8").decode(buffer);
    let text=new TextDecoder("utf-8").decode(buffer);
    const bad=(text.match(/\uFFFD/g)||[]).length;
    if(bad>10){
      try { text=new TextDecoder("windows-1252").decode(buffer); } catch(e){}
    }
    return text.replace(/^\uFEFF/,"");
  },

  detectDelimiter(sample){
    const candidates=[",",";","\t","|"];
    const lines=sample.split(/\r\n|\n|\r/).slice(0,20).filter(x=>x.trim());
    let best=",",bestScore=-1;
    for(const d of candidates){
      const counts=lines.map(l=>this.splitLine(l,d).length);
      const meaningful=counts.filter(c=>c>1);
      const avg=meaningful.reduce((a,b)=>a+b,0)/(meaningful.length||1);
      const variance=meaningful.reduce((a,b)=>a+Math.abs(b-avg),0);
      const score=avg*10-variance+(meaningful.length*2);
      if(score>bestScore){bestScore=score;best=d;}
    }
    return best;
  },

  splitLine(line,delim){
    const out=[];let cur="",q=false;
    for(let i=0;i<line.length;i++){
      const c=line[i],nx=line[i+1];
      if(c=='"' && q && nx=='"'){cur+='"';i++;continue;}
      if(c=='"'){q=!q;continue;}
      if(c===delim && !q){out.push(cur);cur="";continue;}
      cur+=c;
    }
    out.push(cur);
    return out;
  },

  isIntroLine(cells){
    const joined=cells.map(x=>String(x||"").trim()).join(" ").toLowerCase();
    const filled=cells.filter(x=>String(x||"").trim()!=="").length;
    if(!joined) return true;
    if(joined.startsWith("nota:")) return true;
    if(joined.startsWith("marchio=")) return true;
    if(joined.includes("periodo interessato=[") && filled<=4) return true;
    if(joined.startsWith("brand=[") || joined.startsWith("marchio =")) return true;
    if(joined.includes("le fluttuazioni dei tassi di cambio")) return true;
    return false;
  },

  headerScore(cells){
    const names=cells.map(x=>String(x||"").trim().toLowerCase());
    const filled=names.filter(Boolean).length;
    const joined=names.join(" | ");
    let score=filled;
    const strong=[
      "query di ricerca","volume delle query di ricerca","impressioni: numero totale",
      "paese","tipo di account","fattura","importo pagato","data di emissione della fattura",
      "stato della transazione","tipo di transazione","numero di ordine",
      "ordered product sales","sessions","unit session percentage",
      "campaign name","nome campagna","clic","clicks","spesa","costo totale"
    ];
    strong.forEach(k=>{ if(joined.includes(k)) score+=8; });
    if(this.isIntroLine(cells)) score-=100;
    return score;
  },

  parse(text){
    const delimiter=this.detectDelimiter(text.slice(0,12000));
    const lines=text.split(/\r\n|\n|\r/).filter(l=>l.trim()!=="");
    const parsed=lines.map(l=>this.splitLine(l,delimiter));
    if(!parsed.length) return {headers:[],rows:[],delimiter};

    let headerIndex=0,best=-999;
    parsed.forEach((r,i)=>{
      const score=this.headerScore(r);
      if(score>best){best=score;headerIndex=i;}
    });

    const headers=parsed[headerIndex].map((h,i)=>String(h||"").trim() || ("col_"+(i+1)));
    const rows=parsed.slice(headerIndex+1).map(r=>{
      const obj={};
      headers.forEach((h,i)=>obj[h]=r[i]!==undefined?r[i]:"");
      return obj;
    }).filter(o=>Object.values(o).some(v=>String(v).trim()!==""));

    return {headers,rows,delimiter,headerIndex};
  },

  hasAny(h,terms){ return terms.some(t=>h.includes(BBUtils.low(t))); },

  detectReport(headers,fileName){
    const h=headers.map(x=>BBUtils.low(x)).join(" | ");
    const fn=BBUtils.flat(fileName);

    if(this.hasAny(h,["query di ricerca","cerca punteggio query","volume delle query di ricerca","impressioni: numero totale","clic: % quota del marchio","acquisti: % quota del marchio"])) return "brand_analytics";

    if(this.hasAny(h,["paese","tipo di account","nome account","fattura","data di emissione della fattura","importo pagato (convertito)","stato del pagamento"])) return "ad_invoices";
    if(this.hasAny(h,["stato della transazione","tipo di transazione","numero di ordine","commissioni amazon","totale (eur)","transaction type"])) return "transactions";
    if(this.hasAny(h,["ordered product sales","unit session percentage","sessions - total","unità ordinate","vendite prodotto ordinate","child asin","parent asin"])) return "business_report";
    if(this.hasAny(h,["invoice","fattura","paid amount","importo pagato"]) && this.hasAny(h,["advertising","pubblicità","ads","statement","account"])) return "ad_invoices";
    if(this.hasAny(h,["order-id","purchase-date","quantity-purchased","item-price"])) return "orders";
    if(this.hasAny(h,["fulfillable","available","inventory","afn","mfn"]) && h.includes("sku")) return "inventory";
    if(this.hasAny(h,["customer search term","termine di ricerca","search term"])) return "search_terms";

    const looksAds = this.hasAny(h,["impressions","impressioni","viewable impressions"]) && this.hasAny(h,["clicks","clic","click"]) && this.hasAny(h,["spend","spesa","cost","costo totale","vendite","sales","roas","acos"]);
    if(looksAds){
      if(fn.includes("sponsored brands") || fn.includes("sponsored brand") || fn.includes("brands")) return "sponsored_brands";
      if(fn.includes("sponsored products") || fn.includes("sponsored product") || fn.includes("products")) return "sponsored_products";
      if(fn.includes("sponsored display") || fn.includes("display")) return "sponsored_display";
      if(this.hasAny(h,["nome dell'annuncio","ad name","acquisti nuovi clienti","vendite nuovi clienti"])) return "sponsored_brands";
      return "sponsored_products";
    }

    return "unknown";
  },

  sourceFrom(type,fileName,headers){
    const fn=BBUtils.flat(fileName);
    let level="file";
    if(fn.includes("campaign")) level="campaign";
    if(fn.includes("ad group")) level="ad_group";
    if(fn.includes("keyword")) level="keyword";
    if(fn.includes("search term")) level="search_term";
    if(fn.includes("target")) level="target";
    if(type==="brand_analytics") level="query_performance";
    return {type,level,original_file:fileName,headers_count:headers.length};
  }
};
