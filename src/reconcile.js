window.BBReconcile = {
  snapshotTypes:new Set([
    "business_report",
    "inventory",
    "profit_report",
    "store_live_page",
    "store_not_live_page",
    "store_source"
  ]),

  adTypes:new Set([
    "sponsored_products",
    "sponsored_brands",
    "sponsored_display"
  ]),

  levelPriority:{
    campaign:1,
    ad_group:2,
    ad:3,
    keyword:4,
    target:5,
    search_term:6,
    file:9
  },

  fileDate(file){
    const name=String(file?.file_name||"");
    const dates=[];
    let match;
    const isoLike=/(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})/g;
    while((match=isoLike.exec(name))){
      const d=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
      if(!Number.isNaN(d.getTime())) dates.push(d);
    }
    const compact=/(20\d{2})(\d{2})(\d{2})/g;
    while((match=compact.exec(name))){
      const d=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
      if(!Number.isNaN(d.getTime())) dates.push(d);
    }
    const italian=/(\d{1,2})[-_.](\d{1,2})[-_.](\d{2,4})/g;
    while((match=italian.exec(name))){
      const year=Number(String(match[3]).length===2?"20"+match[3]:match[3]);
      const d=new Date(Date.UTC(year,Number(match[2])-1,Number(match[1])));
      if(!Number.isNaN(d.getTime())) dates.push(d);
    }
    if(dates.length) return new Date(Math.max(...dates.map(d=>d.getTime())));
    const imported=new Date(file?.imported_at||0);
    return Number.isNaN(imported.getTime())?new Date(0):imported;
  },

  isoDate(date){
    if(!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0,10);
  },

  /*
   * I Search Terms sono report incrementali: una nuova settimana va sommata
   * allo storico, mentre un nuovo download dello stesso periodo deve
   * sostituire soltanto quel periodo. Amazon normalmente inserisce la data
   * finale nel nome del file; se manca, usiamo il giorno di importazione.
   */
  filePeriodKey(file){
    const reportDate=this.isoDate(this.fileDate(file));
    return reportDate || this.isoDate(new Date(file?.imported_at||0)) || "periodo-sconosciuto";
  },

  compareFiles(a,b){
    const byReportDate=this.fileDate(a)-this.fileDate(b);
    if(byReportDate) return byReportDate;
    const byImportDate=new Date(a?.imported_at||0)-new Date(b?.imported_at||0);
    if(byImportDate) return byImportDate;
    const byRows=Number(a?.row_count||0)-Number(b?.row_count||0);
    if(byRows) return byRows;
    return String(a?.file_name||"").localeCompare(String(b?.file_name||""));
  },

  value(row,names){
    return String(BBUtils.pick(row||{},names)||"").replace(/\s+/g," ").trim();
  },

  normalized(value){
    return BBUtils.low(value).replace(/\s+/g," ").trim();
  },

  canonicalRow(row){
    return Object.keys(row||{})
      .sort((a,b)=>this.normalized(a).localeCompare(this.normalized(b)))
      .map(key=>this.normalized(key)+"="+this.normalized(row[key]))
      .join("|");
  },

  dateValue(row){
    return this.value(row,[
      "Data","Date","Report Date","Data del report","Data della segnalazione",
      "purchase-date","order-date","payments-date","Start Date","Data di inizio",
      "End Date","Data di fine"
    ]);
  },

  identity(type,row,source={}){
    const v=names=>this.normalized(this.value(row,names));
    const date=this.normalized(this.dateValue(row));

    if(type==="orders"){
      const item=v(["order-item-id","Amazon Order Item Id","Amazon Order Item ID","ID articolo ordine"]);
      if(item) return "item|"+item;
      return "order|"+[
        v(["order-id","amazon-order-id","Amazon Order ID","Numero di ordine"]),
        v(["asin","ASIN","product-id"]),
        v(["sku","seller-sku","merchant-sku"]),
        date,
        v(["quantity-purchased","Quantity Purchased","Quantità acquistata"]),
        v(["item-price","Item Price","Prezzo articolo"])
      ].join("|");
    }

    if(type==="transactions"){
      return "transaction|"+[
        date,
        v(["Stato della transazione","Transaction status"]),
        v(["Tipo di transazione","Transaction type"]),
        v(["Numero di ordine","Order ID","order-id"]),
        v(["Dettagli prodotto","Product details","Description"]),
        v(["Totale costo prodotti","Product charges"]),
        v(["Totale sconti","Promotional rebates"]),
        v(["Commissioni Amazon","Amazon fees"]),
        v(["Altre transazioni","Other"]),
        v(["(totale) (EUR)","Totale (EUR)","Total"])
      ].join("|");
    }

    if(type==="ad_invoices"){
      const invoice=v(["Fattura","Invoice","Invoice ID"]);
      if(invoice) return "invoice|"+invoice;
      return "invoice|"+[
        v(["ID account","Account ID","Identificativo dell'account"]),
        v(["Order ID","Ordine"]),
        v(["Data di emissione della fattura","Invoice date","Date"]),
        v(["Importo fatturato (convertito)","Importo pagato (convertito)","Amount Paid"])
      ].join("|");
    }

    if(this.adTypes.has(type)){
      return "ads|"+[
        source.level||"file",
        v(["Campaign ID","ID campagna"]),
        v(["Campaign Name","Nome campagna"]),
        v(["Ad Group ID","ID gruppo di annunci"]),
        v(["Ad Group Name","Nome del gruppo di annunci"]),
        v(["Ad ID","ID annuncio"]),
        v(["Ad Name","Nome dell'annuncio"]),
        v(["Keyword ID","ID parola chiave"]),
        v(["Keyword","Parole chiave"]),
        v(["Target","Targeting","Targeting expression"]),
        v(["Customer Search Term","Termine di ricerca del cliente","Search term"]),
        v(["Match Type","Tipo di corrispondenza"]),
        v(["Advertised ASIN","ASIN pubblicizzato","ASIN"]),
        v(["SKU","Advertised SKU","SKU pubblicizzato"]),
        v(["Placement","Posizionamento"]),
        v(["Start Date","Data di inizio"]),
        v(["End Date","Data di fine"]),
        date
      ].join("|");
    }

    if(type==="search_terms"){
      return "search|"+[
        source.period_key||"periodo-sconosciuto",
        v(["Campaign ID","ID campagna"]),
        v(["Campaign Name","Nome campagna"]),
        v(["Ad Group ID","ID gruppo di annunci"]),
        v(["Ad Group Name","Nome del gruppo di annunci"]),
        v(["Customer Search Term","Termine di ricerca del cliente","Search term"]),
        v(["Keyword","Parole chiave"]),
        v(["Match Type","Tipo di corrispondenza"]),
        v(["Advertised ASIN","ASIN pubblicizzato","ASIN"]),
        v(["Start Date","Data di inizio"]),
        v(["End Date","Data di fine"]),
        date
      ].join("|");
    }

    if(type==="brand_analytics"){
      return "brand|"+[
        v(["Query di ricerca","Search Query"]),
        v(["ASIN","ASIN (child)","ASIN figlio"]),
        v(["Marchio","Brand"]),
        v(["Periodo interessato","Reporting range","Reporting period"]),
        v(["Data della segnalazione","Report Date","Data del report"])
      ].join("|");
    }

    if(type==="store_date"){
      return "store-date|"+[
        date,
        v(["Pagina","Page"]),
        v(["Fonte","Source"])
      ].join("|");
    }

    return "row|"+this.canonicalRow(row);
  },

  activeFiles(type,files){
    const usable=(files||[])
      .filter(file=>file.report_type===type && !file.is_duplicate)
      .slice()
      .sort((a,b)=>this.compareFiles(a,b));
    if(!usable.length) return {files:[],policy:"empty",selectedLevel:null};

    if(this.snapshotTypes.has(type)){
      return {
        files:[usable[usable.length-1]],
        policy:"latest_snapshot",
        selectedLevel:null
      };
    }

    if(this.adTypes.has(type)){
      const availableLevels=new Set(usable.map(file=>file.source?.level||"file"));
      const selectedLevel=Array.from(availableLevels).sort((a,b)=>
        (this.levelPriority[a]||99)-(this.levelPriority[b]||99)
      )[0];
      return {
        files:usable.filter(file=>(file.source?.level||"file")===selectedLevel),
        policy:"entity_latest",
        selectedLevel
      };
    }

    return {files:usable,policy:"row_latest",selectedLevel:null};
  },

  resolve(type,files,records){
    const active=this.activeFiles(type,files);
    const activeIds=new Set(active.files.map(file=>String(file.id)));
    const activeFileMap=new Map(active.files.map(file=>[String(file.id),file]));
    const ordered=(records||[])
      .filter(record=>activeIds.has(String(record.file_id)))
      .slice()
      .sort((a,b)=>{
        const byDate=this.compareFiles(activeFileMap.get(String(a.file_id)),activeFileMap.get(String(b.file_id)));
        return byDate || Number(a.row_index||0)-Number(b.row_index||0);
      });
    const byIdentity=new Map();
    ordered.forEach(record=>{
      const row={...(record.row_data||{})};
      const file=activeFileMap.get(String(record.file_id));
      const source={
        ...(file?.source||{}),
        ...(record.source||{}),
        period_key:this.filePeriodKey(file)
      };
      const key=this.identity(type,row,source);
      byIdentity.set(key,{
        ...row,
        __file_id:record.file_id,
        __file_name:record.file_name,
        __period_key:source.period_key,
        __source:source,
        __imported_at:record.imported_at,
        __identity:key
      });
    });
    const rows=Array.from(byIdentity.values());
    const contributingIds=new Set(rows.map(row=>String(row.__file_id)));
    return {
      rows,
      policy:active.policy,
      selectedLevel:active.selectedLevel,
      activeFileIds:Array.from(contributingIds),
      consideredFileIds:Array.from(activeIds),
      supersededFileIds:(files||[])
        .filter(file=>file.report_type===type && !file.is_duplicate && !contributingIds.has(String(file.id)))
        .map(file=>String(file.id)),
      rawRows:ordered.length,
      deduplicatedRows:Math.max(ordered.length-rows.length,0)
    };
  }
};
