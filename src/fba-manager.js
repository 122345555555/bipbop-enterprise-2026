(function(){
"use strict";

const STATUSES=[
  ["da_preparare","Da preparare"],
  ["in_produzione","In produzione"],
  ["pronto","Pronto"],
  ["inviato","Inviato"],
  ["ricevuto","Ricevuto da Amazon"],
  ["attivo_fba","Attivo FBA"]
];
const LEGACY_STATUSES=[
  ["in_test","In test (precedente)"],
  ["riordina","Riordina (precedente)"],
  ["stop","Stop (precedente)"],
  ["chiuso","Chiuso (precedente)"]
];
const labels=Object.fromEntries([...STATUSES,...LEGACY_STATUSES]);
const selected=new Set();
let filter="";
let pendingIds=[];

function nowISO(){ return new Date().toISOString(); }
function label(status){ return labels[status]||status||labels.da_preparare; }
function statusClass(status){
  return ({
    da_preparare:"fba-status-neutral",
    in_produzione:"fba-status-production",
    pronto:"fba-status-ready",
    inviato:"fba-status-sent",
    ricevuto:"fba-status-received",
    attivo_fba:"fba-status-active",
    stop:"red",chiuso:"red",riordina:"green",in_test:"green"
  })[status]||"";
}
function normalizeItem(item){
  const normalized={...item};
  normalized.status=normalized.status||"da_preparare";
  normalized.statusChangedAt=normalized.statusChangedAt||normalized.updatedAt||normalized.createdAt||"";
  normalized.statusHistory=Array.isArray(normalized.statusHistory)?normalized.statusHistory:[];
  if(!normalized.sentAt && normalized.sendDate) normalized.sentAt=normalized.sendDate;
  return normalized;
}
function transitionItem(item,toStatus,metadata={},changedAt=nowISO()){
  const next=normalizeItem(item),fromStatus=next.status||"da_preparare";
  next.status=toStatus;
  next.updatedAt=changedAt;
  if(fromStatus!==toStatus){
    next.statusChangedAt=changedAt;
    next.statusHistory=[...next.statusHistory,{
      fromStatus,toStatus,changedAt,
      metadata:metadata&&Object.keys(metadata).length?{...metadata}:{}
    }].slice(-50);
  }
  if(toStatus==="inviato"){
    next.sentAt=metadata.sentAt||next.sentAt||changedAt;
    next.sendDate=String(next.sentAt).slice(0,10);
    next.carrier=metadata.carrier||next.carrier||"";
    next.tracking=metadata.tracking||next.tracking||"";
    next.shipmentId=metadata.shipmentId||next.shipmentId||"";
    next.packages=BBUtils.num(metadata.packages)||BBUtils.num(next.packages);
    next.weightKg=BBUtils.num(metadata.weightKg)||BBUtils.num(next.weightKg);
    next.quantitySent=BBUtils.num(metadata.quantitySent)||BBUtils.num(next.quantitySent)||BBUtils.num(next.qty);
  }
  if(toStatus==="ricevuto" && !next.receivedAt) next.receivedAt=changedAt;
  if(toStatus==="attivo_fba" && !next.activeAt) next.activeAt=changedAt;
  return next;
}
function dateValue(value){
  if(!value) return null;
  const s=String(value);
  const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(s)?s+"T12:00:00":s);
  return Number.isNaN(date.getTime())?null:date;
}
function daysBetween(from,to){
  const start=dateValue(from),end=dateValue(to);
  if(!start||!end) return null;
  return Math.max(0,Math.round((end-start)/86400000));
}
function saveItems(items){
  const rules=BBUtils.rules();
  localStorage.setItem(window.BIPBOP_CONFIG.rulesKey,JSON.stringify({...rules,fbaItems:items}));
}
function applyStatus(ids,status,metadata={}){
  const wanted=new Set((ids||[]).map(String));
  const rules=BBUtils.rules();
  const items=(rules.fbaItems||[]).map(item=>wanted.has(String(item.id))?transitionItem(item,status,metadata):item);
  saveItems(items);
  wanted.forEach(id=>selected.delete(id));
  if(window.BBRender) BBRender.renderAll();
}
function updateSelectionUi(){
  const count=selected.size;
  const countEl=BBUtils.el("fbaSelectedCount"),button=BBUtils.el("fbaBulkSentBtn");
  if(countEl) countEl.textContent=count?(count===1?"1 ASIN selezionato":count+" ASIN selezionati"):"Nessun ASIN selezionato";
  if(button) button.disabled=!count;
}
function pruneSelection(validIds){
  const valid=new Set((validIds||[]).map(String));
  selected.forEach(id=>{ if(!valid.has(id)) selected.delete(id); });
}
function openShipment(ids){
  pendingIds=(ids||[]).map(String);
  if(!pendingIds.length) return;
  const dialog=BBUtils.el("fbaShipmentDialog"),form=BBUtils.el("fbaShipmentForm");
  if(!dialog||!form) return;
  form.reset();
  const items=BBUtils.rules().fbaItems||[];
  const first=items.find(x=>String(x.id)===pendingIds[0]);
  BBUtils.el("fbaShipmentSentAt").value=BBUtils.todayISO();
  BBUtils.el("fbaShipmentQuantity").value=first?.qty||10;
  BBUtils.el("fbaShipmentSummary").textContent=pendingIds.length===1
    ? "ASIN "+(first?.asin||"")
    : pendingIds.length+" ASIN selezionati · i dati saranno applicati a tutti";
  dialog.showModal();
}
function shipmentMetadata(){
  return {
    sentAt:BBUtils.el("fbaShipmentSentAt").value,
    carrier:BBUtils.el("fbaShipmentCarrier").value.trim(),
    tracking:BBUtils.el("fbaShipmentTracking").value.trim(),
    shipmentId:BBUtils.el("fbaShipmentId").value.trim(),
    packages:BBUtils.num(BBUtils.el("fbaShipmentPackages").value),
    weightKg:BBUtils.num(BBUtils.el("fbaShipmentWeight").value),
    quantitySent:BBUtils.num(BBUtils.el("fbaShipmentQuantity").value)
  };
}
function bind(){
  document.addEventListener("change",event=>{
    const target=event.target;
    if(target?.id==="fbaStatusFilter"){
      filter=target.value||"";
      selected.clear();
      BBRender.renderAll();
      return;
    }
    if(target?.classList?.contains("fba-row-check")){
      target.checked?selected.add(String(target.dataset.fbaId)):selected.delete(String(target.dataset.fbaId));
      updateSelectionUi();
      return;
    }
    if(target?.classList?.contains("fba-inline-status")){
      const id=String(target.dataset.fbaId||""),status=target.value;
      if(status==="inviato"){
        target.value=target.dataset.currentStatus||"da_preparare";
        openShipment([id]);
      }else{
        applyStatus([id],status);
      }
    }
  });
  document.addEventListener("click",event=>{
    if(event.target.closest("#fbaBulkSentBtn")) openShipment(Array.from(selected));
    if(event.target.closest("#fbaShipmentCancelBtn,#fbaShipmentCloseBtn")) BBUtils.el("fbaShipmentDialog")?.close();
  });
  document.addEventListener("submit",event=>{
    if(event.target?.id!=="fbaShipmentForm") return;
    event.preventDefault();
    applyStatus(pendingIds,"inviato",shipmentMetadata());
    BBUtils.el("fbaShipmentDialog")?.close();
    pendingIds=[];
  });
}

window.BBFbaManager={
  STATUSES,LEGACY_STATUSES,label,statusClass,normalizeItem,transitionItem,daysBetween,
  pruneSelection,
  getFilter(){ return filter; },
  getSelected(){ return new Set(selected); },
  updateSelectionUi,openShipment,applyStatus
};
document.addEventListener("DOMContentLoaded",bind);
})();
