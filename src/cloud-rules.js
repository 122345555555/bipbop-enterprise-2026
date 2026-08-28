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
  rules:BBUtils.localRulesFallback(),
  origin:localStorage.getItem(window.BIPBOP_CONFIG.rulesKey)?"Fallback locale (sola lettura)":"Valori predefiniti",
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
  const raw=localStorage.getItem(window.BIPBOP_CONFIG.rulesKey);
  if(!raw) return null;
  try { return JSON.parse(raw); } catch(e){ throw new Error("Il backup locale bb100_rules non contiene JSON valido."); }
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
  const rows=await BBStorage.operationalRows();
  if(rows.length){
    state.rules=join(rows);
    state.origin="Supabase / bb100_operational_data";
    state.status="synced";
    state.updatedAt=rows.map(r=>r.updated_at).filter(Boolean).sort().pop()||null;
  }else{
    state.status=rawLocal()?"migration_required":"cloud_empty";
    state.origin=rawLocal()?"Fallback locale (migrazione richiesta)":"Supabase (vuoto)";
  }
  state.error=null;
  setDiagnostics(rows);
  return current();
}
function current(){ return clone(state.rules); }
function info(){ return clone(state); }
async function replace(dataset,value){
  if(state.status!=="synced" && state.status!=="cloud_empty") throw new Error("Completa prima la migrazione cloud dei dati locali.");
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
  const snapshot=rawLocal();
  if(!snapshot) throw new Error("Nessun bb100_rules locale da salvare.");
  const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url; a.download="bb100_rules_backup_pre_cloud_"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function previewMigration(){
  const localSnapshot=rawLocal();
  if(!localSnapshot) throw new Error("Su questo dispositivo non è presente bb100_rules. Avvia la migrazione dal Mac dell'ufficio.");
  const snapshot={...BBUtils.defaultRules(),...localSnapshot};
  const local=split(snapshot);
  const cloudRows=await BBStorage.operationalRows();
  const cloud={};
  cloudRows.forEach(r=>{ cloud[r.dataset+"\u0000"+r.record_key]=r.payload; });
  const datasets={};
  for(const [dataset,records] of Object.entries(local)){
    const recordKeys=records.map(r=>r.record_key);
    if(new Set(recordKeys).size!==recordKeys.length) throw new Error("Sono presenti chiavi duplicate in "+dataset+". Correggi il backup prima di migrare: nessun record è stato scritto.");
    let create=0,update=0,unchanged=0;
    records.forEach(r=>{
      const found=cloud[dataset+"\u0000"+r.record_key];
      if(found===undefined) create++;
      else if(JSON.stringify(stable(found))===JSON.stringify(stable(r.payload))) unchanged++;
      else update++;
    });
    const localKeys=new Set(records.map(r=>r.record_key));
    const cloudOnly=cloudRows.filter(r=>r.dataset===dataset&&!localKeys.has(r.record_key)).length;
    datasets[dataset]={count:records.length,create,update,unchanged,cloudOnly};
  }
  const canonical=JSON.stringify(stable(snapshot));
  return {snapshot,datasets,fingerprint:await BBUtils.sha256(canonical),cloudCount:cloudRows.length};
}
async function migrate(preview){
  const result=await BBStorage.migrateOperationalSnapshot(preview.snapshot,preview.fingerprint);
  await load();
  const expected=split({...BBUtils.defaultRules(),...preview.snapshot});
  const actual=split(state.rules);
  for(const dataset of Object.keys(expected)){
    const payloadSet=records=>(records||[]).map(r=>JSON.stringify(stable(r.payload))).sort();
    const wanted=JSON.stringify(payloadSet(expected[dataset]));
    const found=JSON.stringify(payloadSet(actual[dataset]));
    if(wanted!==found) throw new Error("Controllo post-migrazione fallito per "+dataset+". bb100_rules è stato conservato.");
  }
  localStorage.setItem("bb100_cloud_migration",JSON.stringify({fingerprint:preview.fingerprint,completedAt:new Date().toISOString(),result}));
  localStorage.removeItem(window.BIPBOP_CONFIG.rulesKey);
  state.status="synced"; setDiagnostics((await BBStorage.operationalRows()));
  return result;
}

window.BBCloudRules={KEYS,current,info,load,replace,saveRules,rawLocal,split,join,downloadLocalBackup,previewMigration,migrate};
})();
