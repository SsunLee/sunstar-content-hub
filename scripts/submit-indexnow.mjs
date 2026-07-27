const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://sunstar-content-hub.sites.openai.com"
).replace(/\/+$/, "");

const indexNowKey = "8fd6498b0d274934ad567cecd1fae369";
const archivePages = Array.from(
  { length: 22 },
  (_, index) => `${siteUrl}/archive/page/${index + 1}`,
);
const urlList = [
  `${siteUrl}/`,
  `${siteUrl}/entertainment`,
  `${siteUrl}/stocks`,
  `${siteUrl}/archive`,
  `${siteUrl}/about`,
  ...archivePages,
];

const payload = {
  host: new URL(siteUrl).host,
  key: indexNowKey,
  keyLocation: `${siteUrl}/${indexNowKey}.txt`,
  urlList,
};

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: {
    "content-type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(payload),
});

if (![200, 202].includes(response.status)) {
  const detail = await response.text();
  throw new Error(
    `IndexNow submission failed (${response.status}): ${detail.slice(0, 500)}`,
  );
}

console.log(
  JSON.stringify(
    {
      accepted: true,
      status: response.status,
      host: payload.host,
      submitted: urlList.length,
      keyLocation: payload.keyLocation,
    },
    null,
    2,
  ),
);
