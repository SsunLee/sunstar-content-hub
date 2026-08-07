(function () {
  "use strict";

  var SLOT_SELECTOR = "[data-coupang-partners-slot]";
  var SDK_SELECTOR = 'script[data-ssdesk-coupang-sdk="true"]';

  function initSlot(slot) {
    var container = slot.querySelector(".coupang-partners-unit");
    if (!container || container.dataset.coupangInitialized === "true") return;
    container.dataset.coupangInitialized = "true";

    var config = {
      id: Number(slot.getAttribute("data-coupang-partners-id")),
      trackingCode: slot.getAttribute("data-coupang-partners-tracking-code"),
      template: slot.getAttribute("data-coupang-partners-template"),
      width: slot.getAttribute("data-coupang-partners-width"),
      height: slot.getAttribute("data-coupang-partners-height"),
    };

    // Coupang's widget locates its own insertion point via
    // document.currentScript at the moment this script executes, so it must
    // be created and appended synchronously (no async/defer) directly into
    // this slot's placeholder container.
    var initScript = document.createElement("script");
    initScript.text =
      "new PartnersCoupang.G(" + JSON.stringify(config) + ");";
    container.appendChild(initScript);
  }

  function initAllSlots() {
    var slots = Array.prototype.slice.call(
      document.querySelectorAll(SLOT_SELECTOR),
    );
    slots.forEach(initSlot);
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
