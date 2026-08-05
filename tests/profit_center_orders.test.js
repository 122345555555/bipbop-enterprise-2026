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
vm.runInContext(fs.readFileSync(path.join(root, "src/utils.js"), "utf8"), context);
context.BBUtils = context.window.BBUtils;
vm.runInContext(fs.readFileSync(path.join(root, "src/analytics.js"), "utf8"), context);

const validOrder = {
  "order-id":"valid-order",
  "order-item-id":"valid-item",
  "purchase-date":"2025-02-02",
  "quantity-purchased":"3",
  "item-price":"59.70",
  "sku":"SKU-1",
  "product-name":"Bordo murale animali"
};
const cancelledOrder = {
  "order-id":"cancelled-order",
  "order-item-id":"cancelled-item",
  "purchase-date":"2025-02-03",
  "quantity":"0",
  "item-price":"9.90",
  "order-status":"Cancelled",
  "sku":"SKU-2"
};
const unrelatedProfit = {
  "Data di inizio":"01/01/2025",
  "Data di fine":"31/12/2025",
  "ASIN":"B000000001",
  "MSKU":"SKU-1",
  "Vendite nette":"999.00",
  "Unità nette vendute":"99",
  "Totale: Ricavi netti":"500.00"
};
const samples = {orders:[validOrder,cancelledOrder],profit_report:[unrelatedProfit]};
const calc = context.window.BBAnalytics.calc(samples);
const summary = context.window.BBAnalytics.productCostSummary(samples,calc);

assert.equal(summary.sourceLabel,"Report ordini validi");
assert.equal(summary.totals.sales,59.7);
assert.equal(summary.totals.units,3);
assert.equal(summary.rows.length,1);
assert.equal(summary.rows[0].sku,"SKU-1");
assert.equal(summary.rows[0].asin,"B000000001");

console.log("OK: Profit Center alimentato dagli ordini validi, annullati esclusi.");
