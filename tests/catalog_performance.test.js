const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const context = {
  window: {},
  document: { getElementById: () => null },
  localStorage: { getItem: () => null, setItem: () => {} },
  Intl,
  Date,
  console
};
context.window.window = context.window;
context.window.document = context.document;
context.window.localStorage = context.localStorage;
context.window.BIPBOP_CONFIG = { rulesKey: "test_rules" };
vm.createContext(context);
for(const file of ["src/utils.js","src/analytics.js"]){
  vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context);
  context.BBUtils=context.window.BBUtils;
}

const rows = [
  {
    "Titolo ASIN":"Bordo Mongolfiere",
    "ASIN":"B0TEST001",
    "Categoria":"Decorazioni",
    "Data del report":"2026-07-01",
    "Impressioni":"1000",
    "Clic":"30",
    "Aggiunte al carrello":"4",
    "Acquisti":"2",
    "Prezzo mediano":"19,90"
  },
  {
    "Titolo ASIN":"Adesivo Mongolfiere",
    "ASIN":"B0TEST002",
    "Categoria":"Decorazioni",
    "Data del report":"2026-07-07",
    "Impressioni":"800",
    "Clic":"2",
    "Aggiunte al carrello":"0",
    "Acquisti":"0",
    "Prezzo mediano":"19,90"
  }
];

const analysis=context.window.BBAnalytics.catalogSearchPerformance({brand_analytics:rows});
assert.equal(analysis.hasData,true);
assert.equal(analysis.products.length,2);
assert.equal(analysis.totals.impressions,1800);
assert.equal(analysis.totals.clicks,32);
assert.equal(analysis.totals.purchases,2);
assert.equal(context.window.BBAnalytics.dateKey(analysis.period.start),"2026-07-01");
assert.equal(context.window.BBAnalytics.dateKey(analysis.period.end),"2026-07-07");
assert.equal(analysis.winners[0].asin,"B0TEST001");
assert.equal(analysis.lowCtr[0].asin,"B0TEST002");
assert.ok(analysis.actions.length>=2);

console.log("OK: Catalog Search Performance aggregato e suggerimenti generati.");
