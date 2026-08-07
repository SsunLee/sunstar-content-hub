(function () {
  "use strict";

  var SLOT_SELECTOR = "[data-coupang-partners-slot]";
  var SDK_SELECTOR = 'script[data-ssdesk-coupang-sdk="true"]';
  var MOVE_TIMEOUT_MS = 8000;

  // PartnersCoupang.G() inserts its <ins> ad container as a direct child of
  // <body> regardless of where the initializing <script> actually lives in
  // the DOM (it does not honor document.currentScript's parent). So each
  // slot is initialized one at a time, and the next new <ins> that appears
  // under <body> is relocated into that slot's placeholder container.
  function moveNextBodyIns(container, done) {
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
          if (node.nodeType === 1 && node.tagName === "INS") {
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

  function initSlot(slot, done) {
    var container = slot.querySelector(".coupang-partners-unit");
    if (!container || container.dataset.coupangInitialized === "true") {
      done();
      return;
    }
    container.dataset.coupangInitialized = "true";

    var config = {
      id: Number(slot.getAttribute("data-coupang-partners-id")),
      trackingCode: slot.getAttribute("data-coupang-partners-tracking-code"),
      template: slot.getAttribute("data-coupang-partners-template"),
      width: slot.getAttribute("data-coupang-partners-width"),
      height: slot.getAttribute("data-coupang-partners-height"),
    };

    moveNextBodyIns(container, done);

    var initScript = document.createElement("script");
    initScript.text =
      "new PartnersCoupang.G(" + JSON.stringify(config) + ");";
    document.body.appendChild(initScript);
  }

  function initSlotsSequentially(slots, index) {
    if (index >= slots.length) return;
    initSlot(slots[index], function () {
      initSlotsSequentially(slots, index + 1);
    });
  }

  function initAllSlots() {
    var slots = Array.prototype.slice.call(
      document.querySelectorAll(SLOT_SELECTOR),
    );
    initSlotsSequentially(slots, 0);
  }

  var slots = Array.prototype.slice.call(
    document.querySelectorAll(SLOT_SELECTOR),
  );
  if (slots.length === 0) return;

  if (window.PartnersCoupang) {
    initAllSlots();
    return;
  }

  if (document.querySelector(SDK_SELECTOR)) return;

  var sdkUrl = slots[0].getAttribute("data-coupang-partners-sdk-src");
  if (!sdkUrl) return;

  var sdkScript = document.createElement("script");
  sdkScript.src = sdkUrl;
  sdkScript.setAttribute("data-ssdesk-coupang-sdk", "true");
  sdkScript.addEventListener("load", initAllSlots);
  document.body.appendChild(sdkScript);
})();
