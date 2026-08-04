(function () {
  "use strict";

  var SLOT_SELECTOR = "[data-adfit-slot]";
  var SDK_SELECTOR = 'script[data-ssdesk-adfit-sdk="true"]';
  var EMPTY_TIMEOUT_MS = 15000;

  function hideSlot(slot) {
    if (!slot) return;
    slot.classList.remove("is-adfit-filled");
    slot.classList.add("is-adfit-empty");
    slot.hidden = true;
  }

  function markFilled(slot) {
    if (!slot || !slot.querySelector("iframe")) return false;
    slot.hidden = false;
    slot.classList.remove("is-adfit-empty");
    slot.classList.add("is-adfit-filled");
    return true;
  }

  window.ssDeskAdFitNoAd = function (element) {
    var slot = element && element.closest
      ? element.closest(SLOT_SELECTOR)
      : null;
    hideSlot(slot);
  };

  var slots = Array.prototype.slice.call(
    document.querySelectorAll(SLOT_SELECTOR),
  );
  if (slots.length === 0) return;

  var sdkUrl = slots[0].getAttribute("data-adfit-sdk-src");
  var matchingSdkUrl = slots.every(function (slot) {
    return slot.getAttribute("data-adfit-sdk-src") === sdkUrl;
  });
  if (!sdkUrl || !matchingSdkUrl) {
    slots.forEach(hideSlot);
    return;
  }

  slots.forEach(function (slot) {
    if (!slot.querySelector("ins.kakao_ad_area")) {
      hideSlot(slot);
      return;
    }

    var observer = new MutationObserver(function () {
      if (markFilled(slot)) observer.disconnect();
    });
    observer.observe(slot, { childList: true, subtree: true });
    window.setTimeout(function () {
      if (!markFilled(slot)) hideSlot(slot);
      observer.disconnect();
    }, EMPTY_TIMEOUT_MS);
  });

  if (document.querySelector(SDK_SELECTOR)) return;

  var script = document.createElement("script");
  script.async = true;
  script.charset = "utf-8";
  script.src = sdkUrl;
  script.setAttribute("data-ssdesk-adfit-sdk", "true");
  script.addEventListener("error", function () {
    slots.forEach(hideSlot);
  });
  document.body.appendChild(script);
})();
