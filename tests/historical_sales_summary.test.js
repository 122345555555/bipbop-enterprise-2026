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

const order = (id,item,date,qty,sales) => ({
  "order-id": id,
  "order-item-id": item,
  "purchase-date": date,
  "quantity-purchased": String(qty),
  "item-price": String(sales)
});

const summary = context.window.BBAnalytics.historicalSalesSummary({
  orders: [
    order("old","old-1","2024-12-31",1,10),
    order("a","a-1","2025-01-01",2,39.8),
    order("b","b-1","2025-02-10",1,19.9),
    order("b","b-1","2025-02-10",1,19.9)
  ]
}, "2025-01-01", [{date:"2025-02-11",amount:20,units:1}]);

assert.equal(summary.sourceType, "orders");
assert.equal(summary.orders, 2);
assert.equal(summary.units, 4);
assert.equal(Number(summary.sales.toFixed(2)), 79.7);
assert.equal(Number(summary.averageOrder.toFixed(2)), 29.85);
assert.equal(summary.coverageStatus, "complete");
assert.equal(summary.manualSales, 20);

const partial = context.window.BBAnalytics.historicalSalesSummary({
  orders: [order("c","c-1","2025-03-01",1,25)]
}, "2025-01-01", []);
assert.equal(partial.coverageStatus, "observed");

const cancelled = context.window.BBAnalytics.historicalSalesSummary({
  orders: [
    {...order("cancelled","cancelled-1","2025-03-02",0,9.9),"order-status":"Cancelled"},
    order("valid","valid-1","2025-03-03",3,59.7)
  ]
}, "2025-01-01", []);
assert.equal(cancelled.orders, 1);
assert.equal(cancelled.units, 3);
assert.equal(cancelled.sales, 59.7);

const undated = context.window.BBAnalytics.historicalSalesSummary({
  business_report: [{"Ordered Product Sales":"100","Units Ordered":"5"}]
}, "2025-01-01", []);
assert.equal(undated.coverageStatus, "unknown");
assert.equal(undated.sales, 100);
assert.equal(undated.units, 5);

console.log("OK: riepilogo storico dal 01/01/2025 senza doppio conteggio.");
