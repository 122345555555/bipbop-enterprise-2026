global.window=global;
global.document={addEventListener(){},getElementById(){return null;}};
global.localStorage={getItem(){return null;},setItem(){}};
global.BIPBOP_CONFIG={rulesKey:"test_rules"};

require("../src/utils.js");
require("../src/fba-manager.js");

function assert(condition,message){
  if(!condition) throw new Error(message);
}

const base={id:"fba-1",asin:"B012345678",qty:10,status:"da_preparare",createdAt:"2026-07-01T09:00:00Z"};
const production=BBFbaManager.transitionItem(base,"in_produzione",{},"2026-07-02T09:00:00Z");
assert(production.status==="in_produzione","Lo stato deve passare a In produzione.");
assert(production.statusHistory.length===1,"Il primo cambio deve creare una voce di storico.");

const sent=BBFbaManager.transitionItem(production,"inviato",{
  sentAt:"2026-07-03",carrier:"UPS",tracking:"TRACK-1",shipmentId:"FBA-1",packages:2,weightKg:4.5,quantitySent:10
},"2026-07-03T09:00:00Z");
assert(sent.carrier==="UPS"&&sent.tracking==="TRACK-1"&&sent.shipmentId==="FBA-1","I dati spedizione devono essere conservati.");
assert(sent.quantitySent===10&&sent.packages===2&&sent.weightKg===4.5,"Quantità, colli e peso devono essere numerici.");

const received=BBFbaManager.transitionItem(sent,"ricevuto",{},"2026-07-06T09:00:00Z");
const active=BBFbaManager.transitionItem(received,"attivo_fba",{},"2026-07-08T09:00:00Z");
assert(BBFbaManager.daysBetween(active.sentAt,active.receivedAt)===3,"Invio → Ricevuto deve risultare 3 giorni.");
assert(BBFbaManager.daysBetween(active.receivedAt,active.activeAt)===2,"Ricevuto → Attivo deve risultare 2 giorni.");
assert(BBFbaManager.daysBetween(active.sentAt,active.activeAt)===5,"Il tempo totale deve risultare 5 giorni.");
assert(active.statusHistory.length===4,"Tutti i passaggi devono restare nello storico.");

const unchanged=BBFbaManager.transitionItem(active,"attivo_fba",{},"2026-07-09T09:00:00Z");
assert(unchanged.statusHistory.length===4,"Salvare lo stesso stato non deve duplicare lo storico.");

console.log("OK: stati FBA, spedizione, storico e tempi logistici verificati.");
