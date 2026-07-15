export const PLATFORM_MAP = Object.freeze({
  facebook: Object.freeze({
    name: "Facebook",
    icon: "f",
    hosts: Object.freeze(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"]),
    targetHost: "facebed.com",
  }),
  tiktok: Object.freeze({
    name: "TikTok",
    icon: "♪",
    hosts: Object.freeze(["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]),
    targetHost: "tnktok.com",
  }),
  reddit: Object.freeze({
    name: "Reddit",
    icon: "r/",
    hosts: Object.freeze(["reddit.com", "www.reddit.com", "old.reddit.com"]),
    targetHost: "vxreddit.com",
  }),
  x: Object.freeze({
    name: "X (Twitter)",
    icon: "𝕏",
    hosts: Object.freeze(["twitter.com", "www.twitter.com", "x.com", "www.x.com"]),
    targetHost: "fixupx.com",
  }),
  pixiv: Object.freeze({
    name: "Pixiv",
    icon: "P",
    hosts: Object.freeze(["pixiv.net", "www.pixiv.net"]),
    targetHost: "phixiv.net",
  }),
});

export function normalizeInput(value) {
  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue || /^[a-z][a-z\d+.-]*:/i.test(trimmedValue)) return trimmedValue;
  return `https://${trimmedValue}`;
}

export function convertUrl(inputValue) {
  const normalizedValue = normalizeInput(inputValue);

  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    return { ok: false, error: "URL không hợp lệ" };
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname.includes(".")) {
    return { ok: false, error: "URL không hợp lệ" };
  }

  const platformEntry = Object.entries(PLATFORM_MAP).find(([, platform]) =>
    platform.hosts.includes(parsedUrl.hostname.toLowerCase()),
  );

  if (!platformEntry) return { ok: false, error: "Nền tảng chưa được hỗ trợ" };

  const [platformKey, platform] = platformEntry;
  const originalUrl = parsedUrl.href;
  parsedUrl.hostname = platform.targetHost;

  return {
    ok: true,
    platformKey,
    platform,
    originalUrl,
    convertedUrl: parsedUrl.href,
  };
}
