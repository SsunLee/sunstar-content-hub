import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

test("analytics bootstrap redacts search terms before the first pageview", async () => {
  const homepage = await readFile(
    new URL("../vercel-dist/index.html", import.meta.url),
    "utf8",
  );
  const bootstrap = homepage.match(
    /<script>(window\.va=.*?beforeSend.*?<\/script>)/,
  )?.[1];
  assert.ok(bootstrap, "analytics bootstrap is missing");

  const window = { location: { origin: "https://ssundesk.com" } };
  runInNewContext(bootstrap.replace(/<\/script>$/, ""), {
    Object,
    URL,
    window,
  });

  assert.equal(window.vaq.length, 1);
  const [command, beforeSend] = window.vaq[0];
  assert.equal(command, "beforeSend");
  const redacted = beforeSend({
    url: "https://ssundesk.com/archive?q=%ED%86%B0+%ED%99%80%EB%9E%9C%EB%93%9C&category=entertainment#results",
  });
  const url = new URL(redacted.url);
  assert.equal(url.searchParams.has("q"), false);
  assert.equal(url.searchParams.get("category"), "entertainment");
  assert.equal(url.hash, "");
});

test("delegated tracking records one event for static and dynamic actions", async () => {
  const source = await readFile(
    new URL("../public/site-analytics.js", import.meta.url),
    "utf8",
  );
  const listeners = new Map();
  const calls = [];

  class FakeElement {
    constructor(tagName, attributes = {}, parent = null) {
      this.tagName = tagName;
      this.attributes = attributes;
      this.parent = parent;
      this.values = {};
    }

    closest(selector) {
      if (
        selector === "[data-analytics-event]" &&
        this.attributes["data-analytics-event"]
      ) {
        return this;
      }
      return this.parent?.closest(selector) ?? null;
    }

    getAttribute(name) {
      return this.attributes[name] ?? null;
    }

  }

  class FakeFormData {
    constructor(form) {
      this.values = form.values;
    }

    get(name) {
      return this.values[name] ?? null;
    }
  }

  const document = {
    addEventListener(name, listener, capture) {
      listeners.set(name, { capture, listener });
    },
  };
  const window = {
    va(...args) {
      calls.push(args);
    },
  };

  runInNewContext(source, {
    Element: FakeElement,
    FormData: FakeFormData,
    document,
    window,
  });

  assert.equal(listeners.get("click")?.capture, true);
  assert.equal(listeners.get("submit")?.capture, true);

  const dynamicLink = new FakeElement("A", {
    "data-analytics-event": "article_outbound_clicked",
    "data-analytics-article-id": "224364297906",
    "data-analytics-category": "entertainment",
  });
  const linkChild = new FakeElement("SPAN", {}, dynamicLink);
  listeners.get("click").listener({ target: linkChild });

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    [
      "event",
      {
        name: "article_outbound_clicked",
        data: {
          article_id: "224364297906",
          category: "entertainment",
        },
      },
    ],
  ]);

  const detailLink = new FakeElement("A", {
    "data-analytics-event": "article_detail_opened",
    "data-analytics-article-id": "224364909378",
    "data-analytics-category": "entertainment",
  });
  listeners.get("click").listener({ target: detailLink });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), [
    "event",
    {
      name: "article_detail_opened",
      data: {
        article_id: "224364909378",
        category: "entertainment",
      },
    },
  ]);

  const form = new FakeElement("FORM", {
    "data-analytics-event": "archive_search_submitted",
  });
  form.values = { category: "stocks", q: "example query" };
  listeners.get("submit").listener({ target: form });

  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), [
    "event",
    {
      name: "archive_search_submitted",
      data: { category: "stocks", has_query: true },
    },
  ]);

  const localizedLink = new FakeElement("A", {
    "data-analytics-event": "localized_article_outbound_clicked",
    "data-analytics-article-id": "224364297906",
    "data-analytics-locale": "en",
  });
  listeners.get("click").listener({ target: localizedLink });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), [
    "event",
    {
      name: "localized_article_outbound_clicked",
      data: { article_id: "224364297906", locale: "en" },
    },
  ]);

  const languageLink = new FakeElement("A", {
    "data-analytics-event": "language_version_clicked",
    "data-analytics-from-locale": "en",
    "data-analytics-to-locale": "ja",
  });
  listeners.get("click").listener({ target: languageLink });
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))), [
    "event",
    {
      name: "language_version_clicked",
      data: { from_locale: "en", to_locale: "ja" },
    },
  ]);

  const countBeforeSameLocaleClick = calls.length;
  const sameLanguageLink = new FakeElement("A", {
    "data-analytics-event": "language_version_clicked",
    "data-analytics-from-locale": "en",
    "data-analytics-to-locale": "en",
  });
  listeners.get("click").listener({ target: sameLanguageLink });
  assert.equal(calls.length, countBeforeSameLocaleClick);
});
