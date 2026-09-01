const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

test("Supabase-only: ignora e rimuove dati locali, legge e scrive solo il cloud",async()=>{
  const staleLocal={tacos:99,manualSales:[{id:"locale"}]};
  const memory=new Map([
    ["bb100_rules",JSON.stringify(staleLocal)],
    ["bb100_cloud_migration",JSON.stringify({old:true})],
    ["bb100_config",JSON.stringify({url:"https://example.supabase.co",key:"anon"})]
  ]);
  let cloudRows=[
    {dataset:"economic_rules",record_key:"rules",payload:{tacos:15,acos:35,margin:25},updated_at:"2026-09-01T15:00:00Z"},
    {dataset:"manual_sales",record_key:"cloud-sale",payload:{id:"cloud-sale",date:"2026-09-01",asin:"B000000001",units:1,amount:19.9},updated_at:"2026-09-01T15:00:00Z"}
  ];
  const context={
    console,
    localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},
    window:null,
    BIPBOP_CONFIG:{rulesKey:"bb100_rules",storageKey:"bb100_config"},
    BBStorage:{
      async operationalRows(){ return cloudRows; },
      async replaceOperationalDataset(dataset,records){
        cloudRows=cloudRows.filter(r=>r.dataset!==dataset).concat(records.map(r=>({dataset,...r,updated_at:"2026-09-01T16:00:00Z"})));
        return {dataset,count:records.length};
      }
    }
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../src/utils.js"),"utf8"),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../src/cloud-rules.js"),"utf8"),context);

  await context.BBCloudRules.load();
  assert.equal(memory.has("bb100_rules"),false);
  assert.equal(memory.has("bb100_cloud_migration"),false);
  assert.equal(memory.has("bb100_config"),true,"la sola configurazione tecnica resta locale");
  assert.equal(context.BBCloudRules.current().tacos,15,"vince sempre Supabase, non il vecchio localStorage");
  assert.equal(context.BBCloudRules.current().manualSales[0].id,"cloud-sale");
  assert.equal(context.BBCloudRules.info().origin,"Supabase / bb100_operational_data");

  const changed=[...context.BBCloudRules.current().manualSales,{id:"sale-2",date:"2026-09-01",asin:"B000000002",units:1,amount:10}];
  await context.BBCloudRules.replace("manual_sales",changed);
  assert.equal(cloudRows.filter(r=>r.dataset==="manual_sales").length,2);
  assert.equal(memory.has("bb100_rules"),false);
});
