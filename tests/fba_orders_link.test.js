const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={console,window:{},document:{},localStorage:{getItem(){return null}},setTimeout,clearTimeout};
context.window=context;
vm.createContext(context);
for(const f of ['src/utils.js','src/analytics.js']) vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
const A=context.BBAnalytics;
const samples={orders:[
  {'amazon-order-id':'O1','order-item-id':'I1','purchase-date':'2026-08-29T10:00:00Z','asin':'B012345678','quantity-purchased':'2','item-price':'39.80','fulfillment-channel':'AFN'},
  {'amazon-order-id':'O2','order-item-id':'I2','purchase-date':'2026-08-30T10:00:00Z','asin':'B012345678','quantity-purchased':'1','item-price':'19.90','fulfillment-channel':'MFN'},
  {'amazon-order-id':'O3','order-item-id':'I3','purchase-date':'2026-08-20T10:00:00Z','asin':'B012345678','quantity-purchased':'1','item-price':'19.90','fulfillment-channel':'AFN'}
]};
const r=A.fbaTestForItem(samples,{asin:'B012345678',sentAt:'2026-08-25',quantitySent:5});
assert.equal(r.units,2);
assert.equal(r.orders,1);
assert.equal(r.sales,39.8);
assert.equal(r.remaining,3);
assert.equal(r.sellThrough,40);
console.log('OK: il Test FBA legge solo vendite post-invio e, se presente, solo canale Amazon/AFN.');
