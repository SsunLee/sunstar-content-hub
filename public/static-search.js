(() => {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get("q") || "").normalize("NFKC").trim().toLowerCase();
  const category = params.get("category") || "all";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const allowedCategories = new Set([
    "all",
    "entertainment",
    "stocks",
    "archive",
  ]);

  if (!query && (!category || category === "all")) return;
  if (!allowedCategories.has(category)) return;

  const base =
    document.querySelector('meta[name="static-base"]')?.getAttribute("content") ||
    "";
  const resultsSection = document.querySelector(
    'section[aria-labelledby="archive-results-heading"]',
  );
  const pagination = document.querySelector('nav[aria-label="아카이브 페이지"]');
  const heading = document.getElementById("archive-results-heading");
  if (!resultsSection || !heading) return;

  const normalize = (value) =>
    String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const tokens = normalize(query).split(" ").filter(Boolean);
  const labelFor = {
    all: "전체",
    entertainment: "연예",
    stocks: "주식",
    archive: "기록",
  };

  fetch(`${base}/posts.json`)
    .then((response) => {
      if (!response.ok) throw new Error("검색 데이터를 불러오지 못했습니다.");
      return response.json();
    })
    .then((data) => {
      const filtered = data.posts.filter((post) => {
        if (category !== "all" && post.category !== category) return false;
        if (tokens.length === 0) return true;
        const haystack = normalize(
          [
            post.title,
            post.summary,
            post.categoryLabel,
            post.candidate,
            post.work,
            post.role,
            post.stockCode,
            ...(post.tags || []),
          ].join(" "),
        );
        return tokens.every((token) => haystack.includes(token));
      });

      const perPage = 50;
      const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * perPage;
      const visible = filtered.slice(start, start + perPage);

      heading.textContent = query
        ? `‘${params.get("q")}’ 검색 결과`
        : `${labelFor[category]} 글`;

      const list = document.createElement("ol");
      list.className = "static-results";
      list.start = start + 1;

      visible.forEach((post, index) => {
        const item = document.createElement("li");
        item.className = `static-result static-result-${post.category}`;

        const number = document.createElement("span");
        number.className = "static-result-number";
        number.textContent = String(start + index + 1).padStart(4, "0");

        const article = document.createElement("article");
        const meta = document.createElement("p");
        meta.className = "static-result-meta";
        meta.textContent = `${post.categoryLabel || "기록"} · ${post.dateLabel || post.publishedAt.slice(0, 10)}`;

        const title = document.createElement("h3");
        const link = document.createElement("a");
        link.href = `https://blog.naver.com/tnsqo1126/${post.logNo}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.dataset.analyticsEvent = "article_outbound_clicked";
        link.dataset.analyticsArticleId = post.logNo;
        link.dataset.analyticsCategory = post.category;
        link.textContent = post.title;
        title.append(link);
        article.append(meta, title);

        if (post.summary) {
          const summary = document.createElement("p");
          summary.className = "static-result-summary";
          summary.textContent = post.summary;
          article.append(summary);
        }

        item.append(number, article);
        list.append(item);
      });

      const status = document.createElement("p");
      status.className = "static-result-status";
      status.textContent = `총 ${filtered.length.toLocaleString("ko-KR")}건 · ${filtered.length ? start + 1 : 0}–${Math.min(start + visible.length, filtered.length)}`;

      if (visible.length === 0) {
        const empty = document.createElement("p");
        empty.className = "static-empty";
        empty.textContent = "일치하는 글이 없습니다. 검색어를 줄여 보세요.";
        resultsSection.replaceChildren(status, empty);
      } else {
        resultsSection.replaceChildren(status, list);
      }

      if (pagination) pagination.remove();
      if (totalPages > 1) {
        const nav = document.createElement("nav");
        nav.className = "static-pagination";
        nav.setAttribute("aria-label", "검색 결과 페이지");
        for (let index = 1; index <= totalPages; index += 1) {
          const pageLink = document.createElement("a");
          const nextParams = new URLSearchParams(params);
          nextParams.set("page", String(index));
          pageLink.href = `${base}/archive/?${nextParams.toString()}`;
          pageLink.textContent = String(index);
          if (index === currentPage) pageLink.setAttribute("aria-current", "page");
          nav.append(pageLink);
        }
        resultsSection.after(nav);
      }
    })
    .catch((error) => {
      const message = document.createElement("p");
      message.className = "static-empty";
      message.textContent = error.message;
      resultsSection.replaceChildren(message);
    });
})();
