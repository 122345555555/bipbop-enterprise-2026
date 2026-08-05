(function(){
"use strict";

const STATUSES=["Da preparare","In produzione","Pronto","Inviato","Ricevuto da Amazon","Attivo FBA"];
const state={products:[],records:new Map(),selected:new Set(),filter:"",pendingAsins:[],historyAsin:"",ready:false};

function esc(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function slug(value){ return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function product(asin){ return state.products.find(x=>x.asin===asin); }
function record(asin){ return state.records.get(asin)||{asin,status:"Da preparare"}; }
function dateIt(value){ return value?new Date(value).toLocaleDateString("it-IT"):"—"; }
function isoToday(){ return new Date().toISOString().slice(0,10); }
function daysBetween(from,to){
  if(!from||!to) return null;
  const days=Math.round((new Date(to)-new Date(from))/86400000);
  return Number.isFinite(days)?Math.max(0,days):null;
}
function setNotice(message,type){
  const el=BBUtils.el("fbaNotice");
  if(!el) return;
  el.textContent=message||"";
  el.className="notice"+(message?" show "+(type||""):"");
}
function shippingText(r){
  if(!r.sent_at) return "—";
  return '<b>'+dateIt(r.sent_at)+'</b><br><span class="small">'+esc(r.carrier||"—")+' · '+esc(r.tracking||"tracking —")+'</span><br><span class="small">'+esc(r.shipment_id||"Shipment ID —")+' · '+(r.packages||0)+' colli · '+(r.weight_kg||0)+' kg · '+(r.quantity_sent||0)+' pz</span>';
}
function durationText(r){
  const transit=daysBetween(r.sent_at,r.received_at);
  const activation=daysBetween(r.received_at,r.active_at);
  const total=daysBetween(r.sent_at,r.active_at);
  if(transit===null&&activation===null&&total===null) return "—";
  return [transit===null?null:"Invio → ricevuto: "+transit+" gg",activation===null?null:"Ricevuto → attivo: "+activation+" gg",total===null?null:"Totale: "+total+" gg"].filter(Boolean).join("<br>");
}
function renderKpis(){
  const counts=Object.fromEntries(STATUSES.map(x=>[x,0]));
  state.products.forEach(p=>{ const s=record(p.asin).status||STATUSES[0]; counts[s]=(counts[s]||0)+1; });
  const el=BBUtils.el("fbaKpis");
  if(el) el.innerHTML=STATUSES.map(s=>'<div class="fba-kpi status-'+slug(s)+'"><small>'+esc(s)+'</small><strong>'+counts[s]+'</strong></div>').join("");
}
function renderTable(){
  renderKpis();
  const products=state.products.filter(p=>!state.filter||record(p.asin).status===state.filter);
  const box=BBUtils.el("fbaTable");
  if(!box) return;
  if(!state.products.length){
    box.innerHTML='<div class="empty-state">Importa un Business Report o un report Transazioni con ASIN per popolare questa tabella.</div>';
  }else if(!products.length){
    box.innerHTML='<div class="empty-state">Nessun ASIN nello stato selezionato.</div>';
  }else{
    box.innerHTML='<table class="fba-table"><thead><tr><th><span class="sr-only">Seleziona</span></th><th>ASIN / Prodotto</th><th>Stato</th><th>Ultimo cambio</th><th>Dettagli invio</th><th>Tempi</th><th>Azioni</th></tr></thead><tbody>'+products.map(p=>{
      const r=record(p.asin), checked=state.selected.has(p.asin)?" checked":"";
      return '<tr><td><input class="fba-row-check" type="checkbox" data-asin="'+esc(p.asin)+'" aria-label="Seleziona '+esc(p.asin)+'"'+checked+'></td><td><b>'+esc(p.asin)+'</b><br><span class="small">'+esc(p.title||"Senza titolo")+'</span></td><td><select class="status-select status-'+slug(r.status)+'" data-asin="'+esc(p.asin)+'" aria-label="Stato '+esc(p.asin)+'">'+STATUSES.map(s=>'<option value="'+esc(s)+'"'+(s===r.status?' selected':'')+'>'+esc(s)+'</option>').join("")+'</select></td><td>'+dateIt(r.status_changed_at)+'</td><td>'+shippingText(r)+'</td><td class="small">'+durationText(r)+'</td><td><button class="small-btn secondaryBtn fba-history-btn" data-asin="'+esc(p.asin)+'">Storico</button></td></tr>';
    }).join("")+'</tbody></table>';
  }
  const count=state.selected.size;
  BBUtils.el("fbaSelectedCount").textContent=count?(count===1?"1 ASIN selezionato":count+" ASIN selezionati"):"Nessun ASIN selezionato";
  BBUtils.el("fbaBulkSent").disabled=!count;
}
async function load(){
  if(!BBStorage.client()) { renderTable(); return; }
  try{
    const rows=await BBStorage.listFbaStatuses();
    state.records=new Map(rows.map(x=>[x.asin,x]));
    renderTable();
  }catch(e){
    const migration=String(e.message||e).includes("bb100_fba")||String(e.message||e).includes("schema cache");
    setNotice(migration?"Esegui la migrazione SQL FBA indicata nelle istruzioni, poi premi Aggiorna dati.":"Impossibile caricare gli stati FBA: "+(e.message||e),"error");
  }
}
function openShipment(asins){
  state.pendingAsins=asins.slice();
  const form=BBUtils.el("fbaShipmentForm");
  form.reset();
  BBUtils.el("fbaSentAt").value=isoToday();
  BBUtils.el("fbaShipmentSummary").textContent=asins.length===1?"ASIN "+asins[0]:asins.length+" ASIN selezionati · i dati della spedizione saranno applicati a tutti";
  BBUtils.el("fbaShipmentDialog").showModal();
}
async function changeStatus(asin,status,metadata){
  const p=product(asin)||{asin,title:""};
  return BBStorage.setFbaStatus(asin,p.title,status,metadata||{});
}
async function saveStatus(asin,status){
  setNotice("Salvataggio in corso…","info");
  try{
    const saved=await changeStatus(asin,status,{});
    state.records.set(asin,saved);
    setNotice("Stato di "+asin+" aggiornato a “"+status+"”.","success");
    renderTable();
    if(state.historyAsin===asin) await showHistory(asin);
  }catch(e){ setNotice("Stato non salvato: "+(e.message||e),"error"); renderTable(); }
}
async function submitShipment(){
  const values={
    sent_at:BBUtils.el("fbaSentAt").value,
    carrier:BBUtils.el("fbaCarrier").value.trim(),
    tracking:BBUtils.el("fbaTracking").value.trim(),
    shipment_id:BBUtils.el("fbaShipmentId").value.trim(),
    packages:Number(BBUtils.el("fbaPackages").value),
    weight_kg:Number(BBUtils.el("fbaWeight").value),
    quantity_sent:Number(BBUtils.el("fbaQuantity").value)
  };
  const asins=state.pendingAsins.slice(), submit=BBUtils.el("fbaShipmentForm").querySelector('button[type="submit"]');
  submit.disabled=true;
  setNotice("Registrazione invio in corso…","info");
  try{
    for(const asin of asins){
      const saved=await changeStatus(asin,"Inviato",values);
      state.records.set(asin,saved);
    }
    state.selected.clear();
    BBUtils.el("fbaShipmentDialog").close();
    setNotice(asins.length===1?"Invio FBA registrato.":asins.length+" ASIN segnati come inviati.","success");
    renderTable();
    if(state.historyAsin&&asins.includes(state.historyAsin)) await showHistory(state.historyAsin);
  }catch(e){ setNotice("Invio non salvato: "+(e.message||e),"error"); }
  finally{ submit.disabled=false; }
}
async function showHistory(asin){
  state.historyAsin=asin;
  const box=BBUtils.el("fbaHistory");
  box.innerHTML='<div class="empty-state">Caricamento storico di '+esc(asin)+'…</div>';
  try{
    const rows=await BBStorage.listFbaHistory(asin);
    box.innerHTML='<h4>'+esc(asin)+'</h4>'+(rows.length?'<div class="timeline">'+rows.map(h=>{
      const meta=h.metadata||{}, details=[meta.carrier,meta.tracking,meta.shipment_id].filter(Boolean).map(esc).join(" · ");
      return '<div class="timeline-item"><span class="timeline-dot status-'+slug(h.to_status)+'"></span><div><b>'+esc(h.to_status)+'</b><br><span class="small">'+new Date(h.changed_at).toLocaleString("it-IT")+(h.from_status?' · da '+esc(h.from_status):'')+'</span>'+(details?'<br><span class="small">'+details+'</span>':'')+'</div></div>';
    }).join("")+'</div>':'<div class="empty-state">Nessun passaggio registrato.</div>');
  }catch(e){ box.innerHTML='<div class="notice show error">Storico non disponibile: '+esc(e.message||e)+'</div>'; }
}
function bind(){
  if(state.ready) return;
  state.ready=true;
  const filter=BBUtils.el("fbaStatusFilter");
  filter.innerHTML='<option value="">Tutti gli stati</option>'+STATUSES.map(s=>'<option value="'+esc(s)+'">'+esc(s)+'</option>').join("");
  filter.addEventListener("change",e=>{state.filter=e.target.value;renderTable();});
  BBUtils.el("fbaTable").addEventListener("change",e=>{
    const asin=e.target.dataset.asin;
    if(e.target.classList.contains("fba-row-check")){
      e.target.checked?state.selected.add(asin):state.selected.delete(asin);
      renderTable();
    }else if(e.target.classList.contains("status-select")){
      const status=e.target.value;
      if(status==="Inviato"){ renderTable(); openShipment([asin]); }
      else saveStatus(asin,status);
    }
  });
  BBUtils.el("fbaTable").addEventListener("click",e=>{
    const button=e.target.closest(".fba-history-btn");
    if(button) showHistory(button.dataset.asin);
  });
  BBUtils.el("fbaBulkSent").addEventListener("click",()=>openShipment(Array.from(state.selected)));
  BBUtils.el("fbaShipmentClose").addEventListener("click",()=>BBUtils.el("fbaShipmentDialog").close());
  BBUtils.el("fbaShipmentCancel").addEventListener("click",()=>BBUtils.el("fbaShipmentDialog").close());
  BBUtils.el("fbaShipmentForm").addEventListener("submit",e=>{e.preventDefault();submitShipment();});
}

window.BBFba={
  init(){ bind(); renderTable(); },
  setProducts(products){
    state.products=(products||[]).filter(x=>x.asin&&x.asin!=="N/D");
    const valid=new Set(state.products.map(x=>x.asin));
    state.selected.forEach(x=>{if(!valid.has(x)) state.selected.delete(x);});
    renderTable();
  },
  load,
  statuses:STATUSES.slice()
};
})();
