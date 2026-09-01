const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={console,window:{},document:{},localStorage:{getItem(){return null}},setTimeout,clearTimeout};
context.window=context;
vm.createContext(context);
for(const f of ['src/utils.js','src/analytics.js']) vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
const A=context.BBAnalytics;
const samples={
  orders:[
    {'amazon-order-id':'O1','order-item-id':'I1','purchase-date':'2026-08-29','asin':'B012345678','quantity-purchased':'2','item-price':'39.80','fulfillment-channel':'AFN'},
    {'amazon-order-id':'O2','order-item-id':'I2','purchase-date':'2026-08-30','asin':'B012345678','quantity-purchased':'1','item-price':'19.90','fulfillment-channel':'AFN'}
  ],
  sponsored_products:[
    {'Date':'2026-08-29','Advertised ASIN':'B012345678','Spend':'5','7 Day Total Sales':'39.80','Clicks':'10','Impressions':'1000'},
    {'Date':'2026-08-29','Advertised ASIN':'B000000000','Spend':'99','7 Day Total Sales':'999'}
  ]
};
const r=A.fbaReconciliationForItem(samples,{asin:'B012345678',sentAt:'2026-08-25',quantitySent:5});
assert.ok(Math.abs(r.sales-59.7)<0.001);
assert.equal(r.adSpend,5);
assert.equal(r.adSales,39.8);
assert.ok(Math.abs(r.notAttributedSales-19.9)<0.001);
assert.ok(Math.abs(r.tacos-(5/59.7*100))<0.001);
assert.ok(Math.abs(r.acos-(5/39.8*100))<0.001);
assert.equal(r.status,'mista');
console.log('OK: riconciliazione FBA separa vendite reali, attribuite Ads, non attribuite e calcola TACoS/ACOS.');
