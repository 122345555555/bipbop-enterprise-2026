const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const context = {
  window: {},
  document: { getElementById: () => null },
  localStorage: { getItem: () => null, setItem: () => {} },
  Intl,
  Date,
  TextEncoder,
  crypto: globalThis.crypto,
  console
};
context.window.window = context.window;
context.window.document = context.document;
context.window.localStorage = context.localStorage;
context.window.BIPBOP_CONFIG = { rulesKey: "test_rules" };
vm.createContext(context);
for(const file of ["src/utils.js","src/parser.js","src/reconcile.js","src/analytics.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context);
  context.BBUtils=context.window.BBUtils;
  context.BBParser=context.window.BBParser;
  context.BBReconcile=context.window.BBReconcile;
}

const file=(id,type,at,level="file",duplicate=false)=>({
  id,
  report_type:type,
  imported_at:at,
  source:{level},
  is_duplicate:duplicate,
  file_name:id+".csv"
});
const record=(fileId,type,at,index,row,level="file")=>({
  file_id:fileId,
  report_type:type,
  imported_at:at,
  row_index:index,
  row_data:row,
  source:{level},
  file_name:fileId+".csv"
});

// I Business Report sono fotografie cumulative: conta soltanto l'ultimo.
const businessFiles=[
  file("br-old","business_report","2026-07-20T10:00:00Z"),
  file("br-new","business_report","2026-07-27T10:00:00Z")
];
const businessRows=[
  record("br-old","business_report","2026-07-20T10:00:00Z",1,{
    "Unità ordinate":"11",
    "Vendite di prodotti ordinati":"218,50 €"
  }),
  record("br-new","business_report","2026-07-27T10:00:00Z",1,{
    "Unità ordinate":"207",
    "Vendite di prodotti ordinati":"4.041,92 €"
  })
];
const business=context.window.BBReconcile.resolve("business_report",businessFiles,businessRows);
assert.equal(business.policy,"latest_snapshot");
assert.deepEqual(Array.from(business.activeFileIds),["br-new"]);
assert.equal(business.rows.length,1);
const executive=context.window.BBAnalytics.calc({business_report:business.rows});
assert.equal(executive.units,207);
assert.equal(Number(executive.sales.toFixed(2)),4041.92);

// Stesso file: rimane nello storico, ma non entra nuovamente nei dati.
const businessWithDuplicate=context.window.BBReconcile.resolve(
  "business_report",
  [...businessFiles,file("br-copy","business_report","2026-07-27T11:00:00Z","file",true)],
  businessRows
);
assert.equal(businessWithDuplicate.rows.length,1);
assert.deepEqual(Array.from(businessWithDuplicate.activeFileIds),["br-new"]);

// Report transazioni sovrapposti: B compare in entrambi, ma viene contato una volta.
const transactionFiles=[
  file("tx-1","transactions","2026-07-20T10:00:00Z"),
  file("tx-2","transactions","2026-07-27T10:00:00Z")
];
const txA={"Data":"20/07/2026","Tipo di transazione":"Pagamento ordine","Numero di ordine":"A","Totale costo prodotti":"19,90"};
const txB={"Data":"21/07/2026","Tipo di transazione":"Pagamento ordine","Numero di ordine":"B","Totale costo prodotti":"19,90"};
const txC={"Data":"22/07/2026","Tipo di transazione":"Pagamento ordine","Numero di ordine":"C","Totale costo prodotti":"19,90"};
const transactions=context.window.BBReconcile.resolve("transactions",transactionFiles,[
  record("tx-1","transactions","2026-07-20T10:00:00Z",1,txA),
  record("tx-1","transactions","2026-07-20T10:00:00Z",2,txB),
  record("tx-2","transactions","2026-07-27T10:00:00Z",1,txB),
  record("tx-2","transactions","2026-07-27T10:00:00Z",2,txC)
]);
assert.equal(transactions.rows.length,3);
assert.equal(transactions.deduplicatedRows,1);

// Due campagne Sponsored Brands restano entrambe; un aggiornamento della
// campagna A sostituisce soltanto A e non cancella B.
const adFiles=[
  file("sb-a-old","sponsored_brands","2026-07-10T10:00:00Z","ad_group"),
  file("sb-b","sponsored_brands","2026-07-11T10:00:00Z","ad_group"),
  file("sb-a-new","sponsored_brands","2026-07-12T10:00:00Z","ad_group")
];
const adRow=(campaign,spend)=>({
  "Nome campagna":campaign,
  "Nome del gruppo di annunci":"Gruppo "+campaign,
  "Costo totale":String(spend)
});
const ads=context.window.BBReconcile.resolve("sponsored_brands",adFiles,[
  record("sb-a-old","sponsored_brands","2026-07-10T10:00:00Z",1,adRow("A",10),"ad_group"),
  record("sb-b","sponsored_brands","2026-07-11T10:00:00Z",1,adRow("B",20),"ad_group"),
  record("sb-a-new","sponsored_brands","2026-07-12T10:00:00Z",1,adRow("A",12),"ad_group")
]);
assert.equal(ads.rows.length,2);
assert.equal(ads.rows.reduce((sum,row)=>sum+context.window.BBUtils.num(row["Costo totale"]),0),32);
assert.deepEqual(new Set(ads.activeFileIds),new Set(["sb-b","sb-a-new"]));

// La data del report nel nome prevale sull'ordine casuale di selezione.
const datedOld={
  ...file("dated-old","sponsored_brands","2026-07-27T12:00:00Z","ad_group"),
  file_name:"Sponsored_Brands_ad_groups_06_07_2026.csv"
};
const datedNew={
  ...file("dated-new","sponsored_brands","2026-07-27T11:00:00Z","ad_group"),
  file_name:"Sponsored_Brands_ad_groups_13_07_2026.csv"
};
const datedAds=context.window.BBReconcile.resolve("sponsored_brands",[datedOld,datedNew],[
  record("dated-old","sponsored_brands","2026-07-27T12:00:00Z",1,adRow("A",100),"ad_group"),
  record("dated-new","sponsored_brands","2026-07-27T11:00:00Z",1,adRow("A",20),"ad_group")
]);
assert.equal(datedAds.rows.length,1);
assert.equal(context.window.BBUtils.num(datedAds.rows[0]["Costo totale"]),20);

// Non mescola livelli Ads diversi, perché campagna/ad group/keyword
// contengono le stesse metriche aggregate e la somma le duplicherebbe.
const mixedAds=context.window.BBReconcile.resolve("sponsored_brands",[
  file("sb-group","sponsored_brands","2026-07-12T10:00:00Z","ad_group"),
  file("sb-keyword","sponsored_brands","2026-07-13T10:00:00Z","keyword")
],[
  record("sb-group","sponsored_brands","2026-07-12T10:00:00Z",1,adRow("A",12),"ad_group"),
  record("sb-keyword","sponsored_brands","2026-07-13T10:00:00Z",1,{
    ...adRow("A",12),
    "Parole chiave":"mongolfiere"
  },"keyword")
]);
assert.equal(mixedAds.selectedLevel,"ad_group");
assert.equal(mixedAds.rows.length,1);
assert.deepEqual(Array.from(mixedAds.activeFileIds),["sb-group"]);

// I Search Terms di periodi diversi si sommano; lo stesso periodo viene
// invece sostituito dall'ultimo file, senza raddoppiare le keyword.
const searchFile=(id,name,at)=>({
  ...file(id,"search_terms",at),
  file_name:name
});
const searchRow=(term,spend,clicks)=>({
  "Termine di ricerca del cliente":term,
  "Nome campagna":"SB Store",
  "Spesa":String(spend),
  "Clic":String(clicks),
  "Impressioni":"100"
});
const searchFiles=[
  searchFile("st-old","Search_terms_20_07_2026.csv","2026-07-20T10:00:00Z"),
  searchFile("st-week","Search_terms_27_07_2026.csv","2026-07-27T10:00:00Z")
];
const searchTerms=context.window.BBReconcile.resolve("search_terms",searchFiles,[
  record("st-old","search_terms","2026-07-20T10:00:00Z",1,searchRow("adesivi murali bambini","100,00","10")),
  record("st-week","search_terms","2026-07-27T10:00:00Z",1,searchRow("adesivi murali bambini","60,41","5"))
]);
assert.equal(searchTerms.rows.length,2);
const historicalKeywords=context.window.BBAnalytics.keywordRows({search_terms:searchTerms.rows});
assert.equal(historicalKeywords.length,1);
assert.equal(Number(historicalKeywords[0].spend.toFixed(2)),160.41);
assert.equal(historicalKeywords[0].clicks,15);
assert.equal(historicalKeywords[0].periods,2);
assert.equal(context.window.BBAnalytics.keywordCoverage({search_terms:searchTerms.rows}).periods,2);

const samePeriodFiles=[
  searchFile("st-week-old","Search_terms_27_07_2026_old.csv","2026-07-27T09:00:00Z"),
  searchFile("st-week-new","Search_terms_27_07_2026_new.csv","2026-07-27T10:00:00Z")
];
const samePeriod=context.window.BBReconcile.resolve("search_terms",samePeriodFiles,[
  record("st-week-old","search_terms","2026-07-27T09:00:00Z",1,searchRow("adesivi murali bambini","50,00","4")),
  record("st-week-new","search_terms","2026-07-27T10:00:00Z",1,searchRow("adesivi murali bambini","60,41","5"))
]);
assert.equal(samePeriod.rows.length,1);
assert.equal(context.window.BBUtils.num(samePeriod.rows[0]["Spesa"]),60.41);

// Numeri italiani, migliaia Amazon e formato anglosassone.
assert.equal(context.window.BBUtils.num("4.041,92 €"),4041.92);
assert.equal(context.window.BBUtils.num("4,041.92"),4041.92);
assert.equal(context.window.BBUtils.num("5,862"),5862);
assert.equal(context.window.BBUtils.num("0,477"),0.477);
assert.equal(context.window.BBUtils.num("(19,90 €)"),-19.9);

console.log("OK: snapshot cumulativi, Search Terms storici, transazioni sovrapposte, campagne multiple e formati numerici riconciliati.");
