(function () {
  "use strict";

  var SLOT_SELECTOR = "[data-coupang-category-widget-slot]";
  var MOVE_TIMEOUT_MS = 8000;
  var DATA_ATTRS = [
    "partnerId",
    "source",
    "keyword",
    "categoryId",
    "brandId",
    "limit",
    "imageSize",
    "theme",
    "rotation",
    "width",
    "height",
  ];

  // Like the sibling Coupang Partners G() widget, this proxy widget is not
  // guaranteed to insert its output relative to document.currentScript, so
  // watch for a new top-level <body> child and relocate it into the slot's
  // placeholder container instead of leaving it stranded at the end of
  // <body>. If the widget renders correctly into the container on its own,
  // the observer simply finds nothing new there and times out harmlessly.
  function moveNextBodyChild(container, done) {
    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      done();
    }
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (
            node.nodeType === 1 &&
            node.tagName !== "SCRIPT" &&
            !container.contains(node)
          ) {
            container.appendChild(node);
            finish();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true });
    var timer = setTimeout(finish, MOVE_TIMEOUT_MS);
  }

  function initSlot(slot) {
    var container = slot.querySelector(".coupang-partners-unit");
    if (!container || container.dataset.coupangInitialized === "true") return;
    container.dataset.coupangInitialized = "true";

    var src = slot.getAttribute("data-coupang-category-widget-src");
    if (!src) return;

    var script = document.createElement("script");
    script.async = true;
    script.src = src;
    DATA_ATTRS.forEach(function (camelName) {
      var dashName = camelName.replace(/[A-Z]/g, function (letter) {
        return "-" + letter.toLowerCase();
      });
      var value = slot.getAttribute("data-" + dashName);
      if (value !== null) script.setAttribute("data-" + dashName, value);
    });

    moveNextBodyChild(container, function () {});
    container.appendChild(script);
  }

  var slots = Array.prototype.slice.call(
    document.querySelectorAll(SLOT_SELECTOR),
  );
  slots.forEach(initSlot);
})();
