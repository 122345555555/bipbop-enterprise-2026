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
vm.runInContext(fs.readFileSync(path.join(root, "src/parser.js"), "utf8"), context);
context.BBParser = context.window.BBParser;
vm.runInContext(fs.readFileSync(path.join(root, "src/analytics.js"), "utf8"), context);

const row = (orderId, itemId, date, qty, price, title) => ({
  "order-id": orderId,
  "order-item-id": itemId,
  "purchase-date": date,
  "quantity-purchased": String(qty),
  "item-price": price.toFixed(2).replace(".", ","),
  "product-name": title
});

// Dataset di verifica ricostruito dal dettaglio ordini di luglio:
// 8 ordini unici, 9 righe prodotto, 11 pezzi, 218,50 euro.
const orders = [
  row("403-7278592-7155518", "i-1", "2026-07-21", 1, 19.90, "Principe sognatore"),
  row("403-7278592-7155518", "i-2", "2026-07-21", 1, 19.90, "Fate"),
  row("171-5898688-8973901", "i-3", "2026-07-12", 1, 19.90, "Animali in aereo"),
  row("171-6773951-8054755", "i-4", "2026-07-13", 1, 19.50, "Mongolfiere"),
  row("407-2771060-9389104", "i-5", "2026-07-17", 1, 19.90, "Trenino"),
  row("407-4219476-2413960", "i-6", "2026-07-23", 3, 59.70, "Trenino set da tre"),
  row("407-6007765-1789131", "i-7", "2026-07-26", 1, 19.90, "Animali in aereo"),
  row("403-4971911-8105924", "i-8", "2026-07-26", 1, 19.90, "Linea onda"),
  row("403-2869060-4819508", "i-9", "2026-07-26", 1, 19.90, "Animali 3D")
];

const analysis = context.window.BBAnalytics.orderAnalysis({ orders }, { year: "2026", month: "all" });
assert.equal(analysis.totals.orders, 8);
assert.equal(analysis.totals.lines, 9);
assert.equal(analysis.totals.units, 11);
assert.equal(Number(analysis.totals.revenue.toFixed(2)), 218.50);
assert.equal(analysis.monthly.length, 1);
assert.equal(analysis.coherence.ok, true);

const july = context.window.BBAnalytics.orderAnalysis({ orders }, { year: "2026", month: "6" });
assert.equal(july.visible.orders, 8);
assert.equal(july.visible.lines, 9);
assert.equal(july.visible.units, 11);
assert.equal(Number(july.visible.revenue.toFixed(2)), 218.50);
assert.equal(july.detailOrders.length, 8);
assert.equal(july.comparison.current.key, "2026-07");
assert.equal(july.comparison.previous, null);

const augustOrders = orders.concat(row("TEST-AUGUST", "i-10", "2026-08-02", 1, 19.90, "Test agosto"));
const august = context.window.BBAnalytics.orderAnalysis({ orders: augustOrders }, { year: "2026", month: "7" });
assert.equal(august.comparison.current.key, "2026-08");
assert.equal(august.comparison.previous.key, "2026-07");

const withDuplicate = orders.concat({ ...orders[0] });
const deduped = context.window.BBAnalytics.orderAnalysis({ orders: withDuplicate }, { year: "2026", month: "all" });
assert.equal(deduped.totals.orders, 8);
assert.equal(deduped.totals.lines, 9);
assert.equal(deduped.coherence.duplicateLines, 1);

const corruptedPrince = {
  ...orders[0],
  "quantity-purchased": "0",
  "item-price": "0.00",
  "product-name": "Principe sognatore 1 EUR 19.90 Standard WebsiteOrderChannel false false false via scudieri"
};
const bestDuplicate = context.window.BBAnalytics.orderAnalysis(
  { orders: [corruptedPrince, ...orders] },
  { year: "2026", month: "6" }
);
const repairedOrder = bestDuplicate.detailOrders.find(o => o.id === "403-7278592-7155518");
assert.equal(bestDuplicate.totals.units, 11);
assert.equal(Number(bestDuplicate.totals.revenue.toFixed(2)), 218.50);
assert.equal(repairedOrder.units, 2);
assert.equal(Number(repairedOrder.revenue.toFixed(2)), 39.80);
assert.equal(repairedOrder.lines[0].title, "Principe sognatore");

const quotedTsv = [
  ["order-id","order-item-id","product-name","quantity-purchased","item-price","purchase-date"].join("\t"),
  '403-7278592-7155518\ti-quote-1\t"BipBop Stickers "Il principe sognatore" Adesivi murali"\t1\t19.90\t2026-07-21',
  '403-7278592-7155518\ti-quote-2\t"BipBop Stickers Fate Set 30 pz."\t1\t19.90\t2026-07-21'
].join("\r\n");
const parsed = context.window.BBParser.parse(quotedTsv);
assert.equal(parsed.rows.length, 2);
assert.equal(parsed.rows[0]["quantity-purchased"], "1");
assert.equal(parsed.rows[0]["item-price"], "19.90");
assert.equal(parsed.rows[0]["product-name"], 'BipBop Stickers "Il principe sognatore" Adesivi murali');

// L'Executive usa il Business Report come totale cumulativo, mentre il
// Report ordini deduplicato alimenta la lettura settimanale.
const cumulativeBusinessReport = [{ "Units Ordered": "207", "Ordered Product Sales": "4.041,92 €" }];
const executive = context.window.BBAnalytics.calc({
  business_report: cumulativeBusinessReport,
  orders: [...orders, { ...orders[0] }]
});
assert.equal(executive.unitsBusiness, 207);
assert.equal(executive.unitsOrders, 11);
assert.equal(executive.reportedUnits, 207);
assert.equal(executive.units, 207);
assert.equal(executive.unitsSource, "Business Report");
assert.equal(Number(executive.sales.toFixed(2)), 4041.92);
assert.equal(executive.weeklyUnits, 8);
assert.equal(Number(executive.weeklySales.toFixed(2)), 159.20);
assert.match(executive.weeklyLabel,/20\/07.+26\/07\/2026/);

console.log("OK: Executive cumulativo 207 unità / 4.041,92 euro; settimana 8 unità / 159,20 euro.");
