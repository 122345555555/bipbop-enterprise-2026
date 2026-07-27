/*
 * Responsive layout helper.
 *
 * This file only improves presentation: dynamically generated tables are
 * placed inside their own horizontal scroll container. It does not read,
 * transform, calculate, persist, or modify application data.
 */
(function () {
  "use strict";

  var pending = false;

  function wrapGeneratedTables() {
    document.querySelectorAll(".view table:not(.layout-table-ready)").forEach(function (table) {
      table.classList.add("layout-table-ready");

      if (
        table.closest(".table-scroll") ||
        table.closest(".ba-table-wrap") ||
        table.closest(".fba-print-area")
      ) {
        return;
      }

      var wrapper = document.createElement("div");
      wrapper.className = "table-scroll layout-table-scroll";
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Tabella scorrevole");
      wrapper.setAttribute("tabindex", "0");

      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function scheduleWrap() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      wrapGeneratedTables();
    });
  }

  function start() {
    wrapGeneratedTables();

    var appRoot = document.querySelector("main") || document.body;
    var observer = new MutationObserver(scheduleWrap);
    observer.observe(appRoot, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
