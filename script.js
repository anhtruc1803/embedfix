"use strict";

const PLATFORM_MAP = Object.freeze({
  facebook: {
    name: "Facebook",
    icon: "f",
    hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
    targetHost: "facebed.com",
  },
  tiktok: {
    name: "TikTok",
    icon: "♪",
    hosts: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
    targetHost: "tnktok.com",
  },
  reddit: {
    name: "Reddit",
    icon: "r/",
    hosts: ["reddit.com", "www.reddit.com", "old.reddit.com"],
    targetHost: "vxreddit.com",
  },
  x: {
    name: "X (Twitter)",
    icon: "𝕏",
    hosts: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"],
    targetHost: "fixupx.com",
  },
  pixiv: {
    name: "Pixiv",
    icon: "P",
    hosts: ["pixiv.net", "www.pixiv.net"],
    targetHost: "phixiv.net",
  },
});

const STORAGE_KEYS = Object.freeze({
  history: "embedfix-history-v1",
  theme: "embedfix-theme-v1",
});
const MAX_HISTORY_ITEMS = 20;

const elements = {
  root: document.documentElement,
  themeColor: document.querySelector('meta[name="theme-color"]'),
  themeOptions: [...document.querySelectorAll(".theme-option")],
  input: document.querySelector("#urlInput"),
  dropZone: document.querySelector("#dropZone"),
  inputStatus: document.querySelector("#inputStatus"),
  clearButton: document.querySelector("#clearButton"),
  resultPanel: document.querySelector("#resultPanel"),
  platformIcon: document.querySelector("#platformIcon"),
  platformName: document.querySelector("#platformName"),
  convertedUrl: document.querySelector("#convertedUrl"),
  copyButton: document.querySelector("#copyButton"),
  openButton: document.querySelector("#openButton"),
  shareButton: document.querySelector("#shareButton"),
  copyOriginalButton: document.querySelector("#copyOriginalButton"),
  qrToggle: document.querySelector("#qrToggle"),
  qrContent: document.querySelector("#qrContent"),
  qrCode: document.querySelector("#qrCode"),
  platformGrid: document.querySelector("#platformGrid"),
  historySection: document.querySelector("#historySection"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  importInput: document.querySelector("#importInput"),
  toast: document.querySelector("#toast"),
  toastText: document.querySelector("#toastText"),
};

let currentConversion = null;
let historyItems = loadHistory();
let historyTimer = null;
let toastTimer = null;
let qrValue = "";

function normalizeInput(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue || /^[a-z][a-z\d+.-]*:/i.test(trimmedValue)) return trimmedValue;
  return `https://${trimmedValue}`;
}

function convertUrl(inputValue) {
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

function handleInput() {
  const rawValue = elements.input.value;
  elements.clearButton.disabled = !rawValue;
  window.clearTimeout(historyTimer);

  if (!rawValue.trim()) {
    resetResult();
    return;
  }

  const conversion = convertUrl(rawValue);
  if (!conversion.ok) {
    currentConversion = null;
    hideResult();
    setStatus(conversion.error);
    return;
  }

  currentConversion = conversion;
  setStatus("");
  showResult(conversion);

  // Avoid saving each intermediate keystroke as a separate history entry.
  historyTimer = window.setTimeout(() => addToHistory(conversion), 650);
}

function showResult(conversion) {
  elements.platformIcon.textContent = conversion.platform.icon;
  elements.platformName.textContent = conversion.platform.name;
  elements.convertedUrl.textContent = conversion.convertedUrl;
  elements.convertedUrl.href = conversion.convertedUrl;
  elements.resultPanel.setAttribute("aria-hidden", "false");
  elements.resultPanel.classList.remove("is-visible");
  void elements.resultPanel.offsetWidth;
  elements.resultPanel.classList.add("is-visible");
  resetQr();
}

function hideResult() {
  elements.resultPanel.setAttribute("aria-hidden", "true");
  elements.resultPanel.classList.remove("is-visible");
  resetQr();
}

function resetResult() {
  currentConversion = null;
  setStatus("");
  hideResult();
}

function setStatus(message) {
  elements.inputStatus.textContent = message;
  elements.input.setAttribute("aria-invalid", message ? "true" : "false");
}

async function copyText(value, message = "Đã sao chép!") {
  if (!value) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.append(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      textArea.remove();
      if (!copied) throw new Error("Không thể sao chép");
    }
    showToast(message);
  } catch {
    showToast("Không thể sao chép — hãy chọn URL thủ công");
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toastText.textContent = message;
  elements.toast.classList.remove("show");
  void elements.toast.offsetWidth;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2300);
}

function clearConverter() {
  window.clearTimeout(historyTimer);
  elements.input.value = "";
  elements.clearButton.disabled = true;
  resetResult();
  elements.input.focus();
}

function toggleQrCode() {
  const shouldOpen = elements.qrToggle.getAttribute("aria-expanded") !== "true";
  elements.qrToggle.setAttribute("aria-expanded", String(shouldOpen));
  elements.qrContent.hidden = !shouldOpen;
  elements.qrToggle.querySelector("span:first-child").lastChild.textContent = shouldOpen
    ? " Ẩn mã QR"
    : " Hiện mã QR";

  if (shouldOpen && currentConversion) renderQrCode(currentConversion.convertedUrl);
}

function renderQrCode(value) {
  if (qrValue === value && elements.qrCode.childElementCount) return;
  elements.qrCode.replaceChildren();
  qrValue = value;

  if (typeof window.QRCode !== "function") {
    const fallback = document.createElement("p");
    fallback.textContent = "Không thể tạo mã QR. Hãy kiểm tra kết nối.";
    elements.qrCode.append(fallback);
    return;
  }

  new window.QRCode(elements.qrCode, {
    text: value,
    width: 176,
    height: 176,
    colorDark: "#11120f",
    colorLight: "#ffffff",
    correctLevel: window.QRCode.CorrectLevel.M,
  });
}

function resetQr() {
  qrValue = "";
  elements.qrCode.replaceChildren();
  elements.qrContent.hidden = true;
  elements.qrToggle.setAttribute("aria-expanded", "false");
  elements.qrToggle.querySelector("span:first-child").lastChild.textContent = " Hiện mã QR";
}

function addToHistory(conversion) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    platformKey: conversion.platformKey,
    originalUrl: conversion.originalUrl,
    convertedUrl: conversion.convertedUrl,
    createdAt: new Date().toISOString(),
  };

  historyItems = [
    item,
    ...historyItems.filter((historyItem) => historyItem.convertedUrl !== item.convertedUrl),
  ].slice(0, MAX_HISTORY_ITEMS);
  saveHistory();
  renderHistory();
}

function loadHistory() {
  try {
    const storedHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
    return Array.isArray(storedHistory) ? storedHistory.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(historyItems));
  } catch {
    showToast("Không thể lưu lịch sử");
  }
}

function renderHistory() {
  elements.historyList.replaceChildren();
  elements.historySection.hidden = historyItems.length === 0;

  historyItems.forEach((item) => {
    const platform = PLATFORM_MAP[item.platformKey];
    if (!platform) return;

    const wrapper = document.createElement("article");
    wrapper.className = "history-item";

    const platformIcon = document.createElement("span");
    platformIcon.className = "history-platform";
    platformIcon.textContent = platform.icon;
    platformIcon.title = platform.name;

    const urls = document.createElement("div");
    urls.className = "history-urls";
    const name = document.createElement("strong");
    name.textContent = platform.name;
    const converted = document.createElement("p");
    converted.textContent = item.convertedUrl;
    converted.title = item.convertedUrl;
    const original = document.createElement("p");
    original.textContent = item.originalUrl;
    original.title = item.originalUrl;
    urls.append(name, converted, original);

    const actions = document.createElement("div");
    actions.className = "history-actions";
    const copyButton = createIconButton("⧉", `Sao chép URL ${platform.name} đã chuyển đổi`, () =>
      copyText(item.convertedUrl),
    );
    const openButton = createIconButton("↗", `Mở URL ${platform.name} đã chuyển đổi`, () =>
      openSafely(item.convertedUrl),
    );
    actions.append(copyButton, openButton);
    wrapper.append(platformIcon, urls, actions);
    elements.historyList.append(wrapper);
  });
}

function createIconButton(symbol, label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = symbol;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", handler);
  return button;
}

function clearHistory() {
  historyItems = [];
  saveHistory();
  renderHistory();
  showToast("Đã xóa lịch sử");
}

function exportHistory() {
  const file = new Blob([JSON.stringify(historyItems, null, 2)], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = `embedfix-history-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
  showToast("Đã xuất lịch sử");
}

async function importHistory(file) {
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Expected an array");

    const validItems = imported.flatMap((item) => {
      if (!item || typeof item.originalUrl !== "string" || typeof item.convertedUrl !== "string") return [];
      const conversion = convertUrl(item.originalUrl);
      if (!conversion.ok || conversion.convertedUrl !== item.convertedUrl) return [];
      return [{
        id: typeof item.id === "string" ? item.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        platformKey: conversion.platformKey,
        originalUrl: conversion.originalUrl,
        convertedUrl: conversion.convertedUrl,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      }];
    });

    historyItems = [...validItems, ...historyItems]
      .filter((item, index, allItems) => allItems.findIndex((entry) => entry.convertedUrl === item.convertedUrl) === index)
      .slice(0, MAX_HISTORY_ITEMS);
    saveHistory();
    renderHistory();
    showToast(`Đã nhập ${validItems.length} mục lịch sử`);
  } catch {
    showToast("Tệp lịch sử không hợp lệ");
  } finally {
    elements.importInput.value = "";
  }
}

function renderPlatformCards() {
  Object.values(PLATFORM_MAP).forEach((platform) => {
    const card = document.createElement("article");
    card.className = "platform-card";
    const icon = document.createElement("span");
    icon.className = "platform-icon";
    icon.textContent = platform.icon;
    const name = document.createElement("h3");
    name.textContent = platform.name;
    const target = document.createElement("p");
    target.textContent = `→ ${platform.targetHost}`;
    card.append(icon, name, target);
    elements.platformGrid.append(card);
  });
}

function openSafely(url) {
  const newWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (newWindow) newWindow.opener = null;
}

async function shareCurrent() {
  if (!currentConversion || !navigator.share) return;
  try {
    await navigator.share({ title: "Liên kết EmbedFix", url: currentConversion.convertedUrl });
  } catch (error) {
    if (error.name !== "AbortError") showToast("Không thể chia sẻ liên kết này");
  }
}

function applyTheme(theme) {
  const resolvedTheme = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  elements.root.dataset.theme = theme;
  elements.root.dataset.resolvedTheme = resolvedTheme;
  elements.themeColor.content = resolvedTheme === "dark" ? "#070b15" : "#f8fafc";
  elements.themeOptions.forEach((option) => {
    const isActive = option.dataset.themeValue === theme;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });
}

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme);
  } catch {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    // Theme still works for this session when storage is unavailable.
  }
}

function initializeTheme() {
  const storedTheme = getStoredTheme();
  const theme = ["light", "auto", "dark"].includes(storedTheme) ? storedTheme : "auto";
  applyTheme(theme);
  elements.themeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const selectedTheme = option.dataset.themeValue;
      storeTheme(selectedTheme);
      const applySelectedTheme = () => applyTheme(selectedTheme);
      if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applySelectedTheme();
        return;
      }
      const rect = option.getBoundingClientRect();
      elements.root.style.setProperty("--theme-switch-x", `${Math.round(rect.left + rect.width / 2)}px`);
      elements.root.style.setProperty("--theme-switch-y", `${Math.round(rect.top + rect.height / 2)}px`);
      elements.root.classList.add("theme-transition");
      const transition = document.startViewTransition(applySelectedTheme);
      transition.finished.finally(() => elements.root.classList.remove("theme-transition"));
    });
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (elements.root.dataset.theme === "auto") applyTheme("auto");
  });
}

function initializeDragAndDrop() {
  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("drag-over");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("drag-over");
    });
  });
  elements.dropZone.addEventListener("drop", (event) => {
    const droppedText = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    if (!droppedText) return;
    elements.input.value = droppedText.trim().split(/\r?\n/)[0];
    handleInput();
    elements.input.focus();
  });
}

function initializeKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const commandKey = event.ctrlKey || event.metaKey;
    if (commandKey && !event.shiftKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      elements.input.focus();
      elements.input.select();
    }
    if (commandKey && event.shiftKey && event.key.toLowerCase() === "c" && currentConversion) {
      event.preventDefault();
      copyText(currentConversion.convertedUrl);
    }
  });
}

function initializeFromQueryParameter() {
  const initialUrl = new URLSearchParams(window.location.search).get("url");
  if (!initialUrl) return;
  elements.input.value = initialUrl;
  handleInput();
}

function initializeMotionEffects() {
  const revealTargets = document.querySelectorAll(".platform-section, .privacy-note, .platform-card");
  revealTargets.forEach((element) => element.classList.add("reveal"));
  document.querySelectorAll(".platform-card").forEach((element, index) => {
    element.classList.add("stagger-item");
    element.style.setProperty("--d", `${index * 80}ms`);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  revealTargets.forEach((element) => observer.observe(element));

  const updateScrollEffects = () => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
    document.querySelector("#scrollProgress").style.width = `${progress}%`;
    document.querySelectorAll(".blob").forEach((blob, index) => {
      const offset = window.scrollY * (index % 2 === 0 ? -0.08 : 0.12);
      blob.style.setProperty("--py", `${offset.toFixed(1)}px`);
    });
  };
  updateScrollEffects();
  window.addEventListener("scroll", updateScrollEffects, { passive: true });
}

function bindEvents() {
  elements.input.addEventListener("input", handleInput);
  elements.clearButton.addEventListener("click", clearConverter);
  elements.copyButton.addEventListener("click", () => currentConversion && copyText(currentConversion.convertedUrl));
  elements.copyOriginalButton.addEventListener("click", () => currentConversion && copyText(currentConversion.originalUrl, "Đã sao chép URL gốc!"));
  elements.openButton.addEventListener("click", () => currentConversion && openSafely(currentConversion.convertedUrl));
  elements.shareButton.addEventListener("click", shareCurrent);
  elements.qrToggle.addEventListener("click", toggleQrCode);
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.exportButton.addEventListener("click", exportHistory);
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", () => importHistory(elements.importInput.files[0]));
}

function initialize() {
  initializeTheme();
  renderPlatformCards();
  initializeMotionEffects();
  renderHistory();
  bindEvents();
  initializeDragAndDrop();
  initializeKeyboardShortcuts();
  elements.shareButton.hidden = typeof navigator.share !== "function";
  initializeFromQueryParameter();
}

initialize();
