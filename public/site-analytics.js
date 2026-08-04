(function () {
  "use strict";

  function send(name, data) {
    window.va("event", { name: name, data: data });
  }

  function trackedElement(target) {
    return target instanceof Element
      ? target.closest("[data-analytics-event]")
      : null;
  }

  document.addEventListener(
    "click",
    function (event) {
      var element = trackedElement(event.target);
      if (!element || element.tagName === "FORM") return;

      var eventName = element.getAttribute("data-analytics-event");
      if (
        eventName === "article_outbound_clicked" ||
        eventName === "article_detail_opened"
      ) {
        var articleId = element.getAttribute("data-analytics-article-id");
        var category = element.getAttribute("data-analytics-category");
        if (!articleId || !category) return;
        send(eventName, { article_id: articleId, category: category });
        return;
      }

      if (eventName === "naver_profile_clicked") {
        var placement = element.getAttribute("data-analytics-placement");
        if (!placement) return;
        send(eventName, { placement: placement });
        return;
      }

      if (
        eventName === "localized_article_opened" ||
        eventName === "localized_article_outbound_clicked"
      ) {
        var localizedArticleId = element.getAttribute(
          "data-analytics-article-id",
        );
        var locale = element.getAttribute("data-analytics-locale");
        if (!localizedArticleId || !locale) return;
        send(eventName, { article_id: localizedArticleId, locale: locale });
        return;
      }

      if (eventName === "language_version_clicked") {
        var fromLocale = element.getAttribute("data-analytics-from-locale");
        var toLocale = element.getAttribute("data-analytics-to-locale");
        if (!fromLocale || !toLocale || fromLocale === toLocale) return;
        send(eventName, {
          from_locale: fromLocale,
          to_locale: toLocale,
        });
      }
    },
    true,
  );

  document.addEventListener(
    "submit",
    function (event) {
      var form = trackedElement(event.target);
      if (
        !form ||
        form.getAttribute("data-analytics-event") !==
          "archive_search_submitted"
      ) {
        return;
      }

      var values = new FormData(form);
      var rawCategory = String(values.get("category") || "all");
      var allowedCategories = ["all", "entertainment", "stocks", "archive"];
      var category = allowedCategories.includes(rawCategory)
        ? rawCategory
        : "all";
      var hasQuery = String(values.get("q") || "").trim().length > 0;
      send("archive_search_submitted", {
        category: category,
        has_query: hasQuery,
      });
    },
    true,
  );

})();
