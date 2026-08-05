const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rules = JSON.stringify({monthlyFee:39,subscriptionMonths:18});
const context = {
  window: {},
  document: { getElementById: () => null },
  localStorage: { getItem: key => key === "test_rules" ? rules : null, setItem: () => {} },
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

const profit = {
  "Data di inizio":"07/08/2026",
  "Data di fine":"07/27/2026",
  "Vendite nette":"218.50",
  "Unità nette vendute":"11",
  "Totale: Commissione per segnalazione":"15.48",
  "Totale: Addebito per Sponsored Products":"0",
  "Totale: Ricavi netti":"203.02"
};
const mismatchedAd = {
  "Start Date":"2025-01-01",
  "End Date":"2026-07-06",
  "Spend":"2171.11"
};
const mismatchedSamples = {profit_report:[profit],sponsored_products:[mismatchedAd]};
const mismatchedCalc = context.window.BBAnalytics.calc(mismatchedSamples);
assert.equal(Number(mismatchedCalc.amazonFeesProfit.toFixed(2)),15.48);
const partial = context.window.BBAnalytics.profitReconciliation(mismatchedSamples,mismatchedCalc);
assert.equal(partial.periodLabel,"08/07/2026 – 27/07/2026");
assert.equal(partial.complete,false);
assert.equal(partial.matchedExternalAds,null);
assert.equal(Number(partial.periodSubscription.toFixed(2)),25.63);
assert.equal(Number(partial.comparableBalance.toFixed(2)),177.39);

const matchedAd = {
  "Start Date":"2026-07-08",
  "End Date":"2026-07-27",
  "Spend":"50"
};
const matchedSamples = {profit_report:[profit],sponsored_products:[matchedAd]};
const matchedCalc = context.window.BBAnalytics.calc(matchedSamples);
const complete = context.window.BBAnalytics.profitReconciliation(matchedSamples,matchedCalc);
assert.equal(complete.complete,true);
assert.equal(complete.matchedExternalAds,50);
assert.equal(complete.extraAds,50);
assert.equal(Number(complete.comparableBalance.toFixed(2)),127.39);

const historicalOrders = [
  {"order-id":"O-1","order-item-id":"I-1","purchase-date":"2025-01-02","quantity-purchased":"1","item-price":"19.90","sku":"SKU-1"},
  {"order-id":"O-2","order-item-id":"I-2","purchase-date":"2026-08-04","quantity-purchased":"1","item-price":"19.90","sku":"SKU-1"}
];
const partialHistorySamples = {
  orders:historicalOrders,
  ad_invoices:[{"__file_name":"statement 20250706 to 20260706.csv","Importo pagato (convertito)":"2171.11"}]
};
const partialHistoryCalc = context.window.BBAnalytics.calc(partialHistorySamples);
const partialHistory = context.window.BBAnalytics.historicalAdsContext(partialHistorySamples,partialHistoryCalc);
assert.equal(partialHistory.comparable,false);
assert.equal(partialHistory.amount,2171.11);
assert.equal(partialHistory.allocatedAmount,0);
assert.equal(context.window.BBAnalytics.productCostSummary(partialHistorySamples,partialHistoryCalc).totals.adsAllocated,0);

const completeHistorySamples = {
  orders:historicalOrders,
  ad_invoices:[{"__file_name":"statement 20250101 to 20260804.csv","Importo pagato (convertito)":"2171.11"}]
};
const completeHistoryCalc = context.window.BBAnalytics.calc(completeHistorySamples);
const completeHistory = context.window.BBAnalytics.historicalAdsContext(completeHistorySamples,completeHistoryCalc);
assert.equal(completeHistory.comparable,true);
assert.equal(completeHistory.allocatedAmount,2171.11);

console.log("OK: fee corrette e Ads allocate soltanto su periodi confrontabili.");
