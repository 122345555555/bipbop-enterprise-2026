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

const row = (orderId, itemId, date, qty, price, title) => ({
  "order-id": orderId,
  "order-item-id": itemId,
  "purchase-date": date,
  "quantity-purchased": String(qty),
  "item-price": price.toFixed(2).replace(".", ","),
  "product-name": title
});

// Dataset di verifica ricostruito sui totali confermati del file ordini:
// 7 ordini unici, 8 righe prodotto, 10 pezzi, 198,60 euro.
const orders = [
  row("403-7278592-7155518", "i-1", "2026-06-02", 1, 19.90, "Principe sognatore"),
  row("403-7278592-7155518", "i-2", "2026-06-02", 1, 19.90, "Fate"),
  row("171-0000000-0000001", "i-3", "2026-06-08", 1, 19.90, "Adesivo A"),
  row("171-0000000-0000002", "i-4", "2026-06-12", 1, 19.90, "Adesivo B"),
  row("171-0000000-0000003", "i-5", "2026-06-20", 1, 19.90, "Adesivo C"),
  row("171-0000000-0000004", "i-6", "2026-06-27", 1, 19.50, "Bordo"),
  row("171-0000000-0000005", "i-7", "2026-07-01", 1, 19.90, "Adesivo D"),
  row("407-4219476-2413960", "i-8", "2026-07-05", 3, 59.70, "Set da tre")
];

const analysis = context.window.BBAnalytics.orderAnalysis({ orders }, { year: "2026", month: "all" });
assert.equal(analysis.totals.orders, 7);
assert.equal(analysis.totals.lines, 8);
assert.equal(analysis.totals.units, 10);
assert.equal(Number(analysis.totals.revenue.toFixed(2)), 198.60);
assert.equal(analysis.monthly.length, 2);
assert.equal(analysis.coherence.ok, true);

const july = context.window.BBAnalytics.orderAnalysis({ orders }, { year: "2026", month: "6" });
assert.equal(july.visible.orders, 2);
assert.equal(july.visible.lines, 2);
assert.equal(july.visible.units, 4);
assert.equal(Number(july.visible.revenue.toFixed(2)), 79.60);
assert.equal(july.detailOrders.length, 2);
assert.equal(july.comparison.current.key, "2026-07");
assert.equal(july.comparison.previous.key, "2026-06");

const withDuplicate = orders.concat({ ...orders[0] });
const deduped = context.window.BBAnalytics.orderAnalysis({ orders: withDuplicate }, { year: "2026", month: "all" });
assert.equal(deduped.totals.orders, 7);
assert.equal(deduped.totals.lines, 8);
assert.equal(deduped.coherence.duplicateLines, 1);

console.log("OK: 7 ordini, 8 righe, 10 pezzi, 198,60 euro; drill-down e deduplicazione verificati.");
