(function(){
"use strict";

const KEYS={
  economic_rules:"economicRules",
  product_costs:"productCosts",
  competitors:"competitors",
  manual_sales:"manualSales",
  fba_items:"fbaItems"
};
const state={
  rules:BBUtils.defaultRules(),
  origin:"Supabase / bb100_operational_data",
  status:"not_loaded",
  updatedAt:null,
  diagnostics:{},
  error:null
};

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value&&typeof value==="object") return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
function keyFor(dataset,item,index=0){
  if(dataset==="economic_rules") return "rules";
  if(dataset==="product_costs") return String(item.record_key||item.key||index);
  if(dataset==="competitors") return String(item.id||item.domain||item.name||index).trim().toLowerCase();
  if(dataset==="manual_sales") return String(item.id||[item.date,item.asin,item.amount,index].join("|"));
  if(dataset==="fba_items") return String(item.id||item.asin||index).trim().toLowerCase();
  return String(index);
}
function split(snapshot){
  const all=clone(snapshot||{});
  const productCosts=all.productCosts||{};
  const competitors=all.competitors||[];
  const manualSales=all.manualSales||[];
  const fbaItems=all.fbaItems||[];
  delete all.productCosts; delete all.competitors; delete all.manualSales; delete all.fbaItems;
  return {
    economic_rules:[{record_key:"rules",payload:all}],
    product_costs:Object.entries(productCosts).map(([record_key,payload])=>({record_key,payload})),
    competitors:competitors.map((payload,i)=>({record_key:keyFor("competitors",payload,i),payload})),
    manual_sales:manualSales.map((payload,i)=>({record_key:keyFor("manual_sales",payload,i),payload})),
    fba_items:fbaItems.map((payload,i)=>({record_key:keyFor("fba_items",payload,i),payload}))
  };
}
function join(rows){
  const result=BBUtils.defaultRules();
  result.productCosts={}; result.competitors=[]; result.manualSales=[]; result.fbaItems=[];
  for(const row of rows||[]){
    if(row.dataset==="economic_rules") Object.assign(result,row.payload||{});
    else if(row.dataset==="product_costs") result.productCosts[row.record_key]=row.payload||{};
    else if(row.dataset==="competitors") result.competitors.push(row.payload||{});
    else if(row.dataset==="manual_sales") result.manualSales.push(row.payload||{});
    else if(row.dataset==="fba_items") result.fbaItems.push(row.payload||{});
  }
  const newest=(a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""));
  result.competitors.sort(newest);
  result.manualSales.sort(newest);
  result.fbaItems.sort(newest);
  return result;
}
function rawLocal(){
  // Compatibilità API: dalla v1.4.0 i dati locali non sono più una fonte.
  return null;
}
function setDiagnostics(rows){
  state.diagnostics={};
  for(const dataset of Object.keys(KEYS)){
    const selected=(rows||[]).filter(r=>r.dataset===dataset);
    state.diagnostics[dataset]={
      dataset,
      label:{economic_rules:"Regole economiche",product_costs:"Costi prodotto",competitors:"Competitor",manual_sales:"Vendite manuali",fba_items:"FBA Test"}[dataset],
      origin:state.origin,
      count:selected.length,
      updatedAt:selected.map(r=>r.updated_at).filter(Boolean).sort().pop()||state.updatedAt,
      status:state.status
    };
  }
}
async function load(){
  // Pulisce definitivamente eventuali vecchie copie operative del browser.
  try{
    localStorage.removeItem(window.BIPBOP_CONFIG.rulesKey);
    localStorage.removeItem("bb100_cloud_migration");
  }catch(e){}
  const rows=await BBStorage.operationalRows();
  if(rows.length){
    state.rules=join(rows);
    state.status="synced";
    state.updatedAt=rows.map(r=>r.updated_at).filter(Boolean).sort().pop()||null;
  }else{
    state.rules=BBUtils.defaultRules();
    state.status="cloud_empty";
    state.updatedAt=null;
  }
  state.origin="Supabase / bb100_operational_data";
  state.error=null;
  setDiagnostics(rows);
  return current();
}
function current(){ return clone(state.rules); }
function info(){ return clone(state); }
async function replace(dataset,value){
  if(state.status!=="synced" && state.status!=="cloud_empty") throw new Error("Supabase non è ancora disponibile. Aggiorna i dati e riprova.");
  const next={...state.rules,[KEYS[dataset]]:clone(value)};
  let records;
  if(dataset==="economic_rules"){
    next.productCosts=state.rules.productCosts; next.competitors=state.rules.competitors; next.manualSales=state.rules.manualSales; next.fbaItems=state.rules.fbaItems;
    records=split(next).economic_rules;
  }else records=split(next)[dataset];
  await BBStorage.replaceOperationalDataset(dataset,records);
  state.rules=next; state.origin="Supabase / bb100_operational_data"; state.status="synced"; state.updatedAt=new Date().toISOString();
  setDiagnostics(Object.entries(split(state.rules)).flatMap(([name,list])=>list.map(x=>({dataset:name,...x,updated_at:state.updatedAt}))));
  return current();
}
async function saveRules(rules){
  const economic=clone(rules);
  delete economic.productCosts; delete economic.competitors; delete economic.manualSales; delete economic.fbaItems;
  const next={...state.rules,...economic};
  const records=split(next).economic_rules;
  await BBStorage.replaceOperationalDataset("economic_rules",records);
  state.rules=next; state.status="synced"; state.origin="Supabase / bb100_operational_data"; state.updatedAt=new Date().toISOString();
  await load();
  return current();
}
function downloadLocalBackup(){
  throw new Error("Disattivato: dalla v1.4.0 i dati operativi sono salvati esclusivamente su Supabase.");
}
async function previewMigration(){
  throw new Error("Migrazione locale disattivata: Supabase è l’unica fonte dati.");
}
async function migrate(){
  throw new Error("Migrazione locale disattivata: Supabase è l’unica fonte dati.");
}

window.BBCloudRules={KEYS,current,info,load,replace,saveRules,rawLocal,split,join,downloadLocalBackup,previewMigration,migrate};
})();
