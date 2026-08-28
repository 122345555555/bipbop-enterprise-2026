const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {webcrypto}=require("node:crypto");

test("migrazione operativa: anteprima, cloud autorevole, idempotenza client e rimozione fallback",async()=>{
  const local={
    tacos:17,acos:31,margin:27,
    productCosts:{adesivi:{label:"Adesivi",salePrice:19.9}},
    competitors:[{id:"comp-1",name:"Concorrente"}],
    manualSales:[{id:"sale-1",date:"2026-08-20",asin:"B000000001",units:2,amount:29.8}],
    fbaItems:[{id:"fba-1",asin:"B000000001",status:"inviato",tracking:"TRACK",shipmentId:"SHIP",statusHistory:[{fromStatus:"pronto",toStatus:"inviato"}]}]
  };
  const memory=new Map([["bb100_rules",JSON.stringify(local)]]);
  let cloudRows=[];
  const context={
    console,crypto:webcrypto,TextEncoder,Blob,setTimeout,clearTimeout,
    localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},
    document:{getElementById:()=>null},
    window:null,
    BIPBOP_CONFIG:{rulesKey:"bb100_rules",storageKey:"bb100_config"},
    BBStorage:{
      async operationalRows(){ return cloudRows; },
      async replaceOperationalDataset(dataset,records){
        cloudRows=cloudRows.filter(r=>r.dataset!==dataset).concat(records.map(r=>({dataset,...r,updated_at:"2026-08-28T10:00:00Z"})));
        return {dataset,count:records.length};
      },
      async migrateOperationalSnapshot(snapshot,fingerprint){
        cloudRows=Object.entries(context.BBCloudRules.split(snapshot)).flatMap(([dataset,records])=>records.map(r=>({dataset,...r,updated_at:"2026-08-28T10:00:00Z"})));
        return {migrationId:"migration-1",fingerprint};
      }
    }
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../src/utils.js"),"utf8"),context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,"../src/cloud-rules.js"),"utf8"),context);

  const preview=await context.BBCloudRules.previewMigration();
  assert.equal(preview.datasets.fba_items.count,1);
  assert.equal(preview.datasets.fba_items.create,1);
  assert.equal(preview.datasets.manual_sales.create,1);

  await context.BBCloudRules.migrate(preview);
  assert.equal(memory.has("bb100_rules"),false);
  assert.equal(context.BBCloudRules.info().status,"synced");
  assert.equal(context.BBCloudRules.current().fbaItems[0].tracking,"TRACK");
  assert.equal(context.BBCloudRules.current().fbaItems[0].statusHistory.length,1);

  const changed=[...context.BBCloudRules.current().manualSales,{id:"sale-2",date:"2026-08-21",asin:"B000000002",units:1,amount:10}];
  await context.BBCloudRules.replace("manual_sales",changed);
  assert.equal(cloudRows.filter(r=>r.dataset==="manual_sales").length,2);
  assert.equal(memory.has("bb100_rules"),false);
});
