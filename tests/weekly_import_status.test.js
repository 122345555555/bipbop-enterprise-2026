global.window=global;
global.document={getElementById(){ return null; }};
require("../src/utils.js");

function assert(condition,message){
  if(!condition) throw new Error(message);
}

const previousTuesday=new Date(2026,6,21,10,0,0);
const monday=new Date(2026,6,27,12,0,0);
const tuesday=new Date(2026,6,28,9,0,0);
const tuesdayUpdate=new Date(2026,6,28,9,15,0);

const mondayStatus=BBUtils.weeklyImportStatus([{imported_at:previousTuesday.toISOString(),is_duplicate:false}],monday);
assert(mondayStatus.fresh,"Il report caricato martedì deve restare verde fino al lunedì successivo.");

const resetStatus=BBUtils.weeklyImportStatus([{imported_at:previousTuesday.toISOString(),is_duplicate:false}],tuesday);
assert(!resetStatus.fresh,"Il semaforo deve tornare rosso il martedì della nuova settimana.");

const updatedStatus=BBUtils.weeklyImportStatus([{imported_at:tuesdayUpdate.toISOString(),is_duplicate:false}],tuesdayUpdate);
assert(updatedStatus.fresh,"Un nuovo import del martedì deve riportare il semaforo sul verde.");

console.log("OK: semaforo settimanale verde fino a lunedì, rosso ogni nuovo martedì, verde dopo il nuovo import.");
