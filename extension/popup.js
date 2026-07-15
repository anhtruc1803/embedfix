import { PLATFORM_MAP, convertUrl } from "./core/converter.js";

const STORAGE_KEYS = Object.freeze({
  history: "embedfixHistory",
  theme: "embedfixTheme",
});
const MAX_HISTORY_ITEMS = 20;
const THEME_SEQUENCE = ["auto", "light", "dark"];
const THEME_ICONS = Object.freeze({ auto: "◐", light: "☀", dark: "☾" });
const THEME_LABELS = Object.freeze({ auto: "hệ thống", light: "sáng", dark: "tối" });

const elements = {
  root: document.documentElement,
  themeButton: document.querySelector("#themeButton"),
  themeIcon: document.querySelector("#themeIcon"),
  input: document.querySelector("#urlInput"),
  dropZone: document.querySelector("#dropZone"),
  status: document.querySelector("#statusMessage"),
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
  qrPanel: document.querySelector("#qrPanel"),
  qrCode: document.querySelector("#qrCode"),
  platformList: document.querySelector("#platformList"),
  historySection: document.querySelector("#historySection"),
  historyList: document.querySelector("#historyList"),
  importButton: document.querySelector("#importButton"),
  exportButton: document.querySelector("#exportButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  importInput: document.querySelector("#importInput"),
  toast: document.querySelector("#toast"),
  toastText: document.querySelector("#toastText"),
};

let currentConversion = null;
let historyItems = [];
let currentTheme = "auto";
let saveTimer = null;
let toastTimer = null;
let renderedQrValue = "";

function handleInput() {
  window.clearTimeout(saveTimer);
  const inputValue = elements.input.value;
  elements.clearButton.disabled = !inputValue;

  if (!inputValue.trim()) {
    resetResult();
    return;
  }

  const conversion = convertUrl(inputValue);
  if (!conversion.ok) {
    currentConversion = null;
    elements.resultPanel.hidden = true;
    setStatus(conversion.error);
    resetQr();
    return;
  }

  currentConversion = conversion;
  setStatus("");
  showResult(conversion);
  saveTimer = window.setTimeout(() => saveToHistory(conversion), 550);
}

function showResult(conversion) {
  elements.platformIcon.textContent = conversion.platform.icon;
  elements.platformName.textContent = conversion.platform.name;
  elements.convertedUrl.textContent = conversion.convertedUrl;
  elements.convertedUrl.title = conversion.convertedUrl;
  elements.resultPanel.hidden = false;
  resetQr();
}

function resetResult() {
  currentConversion = null;
  elements.resultPanel.hidden = true;
  setStatus("");
  resetQr();
}

function clearConverter() {
  window.clearTimeout(saveTimer);
  elements.input.value = "";
  elements.clearButton.disabled = true;
  resetResult();
  elements.input.focus();
}

function setStatus(message) {
  elements.status.textContent = message;
  elements.input.setAttribute("aria-invalid", String(Boolean(message)));
}

async function copyText(text, successMessage = "Đã sao chép!") {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
    return true;
  } catch {
    showToast("Không thể sao chép");
    return false;
  }
}

async function commitCurrentConversion() {
  if (!currentConversion) return;
  window.clearTimeout(saveTimer);
  if (historyItems[0]?.convertedUrl === currentConversion.convertedUrl) return;
  await saveToHistory(currentConversion);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toastText.textContent = message;
  elements.toast.classList.remove("show");
  void elements.toast.offsetWidth;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2100);
}

async function openCurrent() {
  if (!currentConversion) return;
  await commitCurrentConversion();
  await chrome.tabs.create({ url: currentConversion.convertedUrl });
}

async function shareCurrent() {
  if (!currentConversion || typeof navigator.share !== "function") return;
  try {
    await commitCurrentConversion();
    await navigator.share({ title: "Liên kết EmbedFix", url: currentConversion.convertedUrl });
  } catch (error) {
    if (error.name !== "AbortError") showToast("Không thể chia sẻ");
  }
}

function toggleQr() {
  const shouldOpen = elements.qrToggle.getAttribute("aria-expanded") !== "true";
  elements.qrToggle.setAttribute("aria-expanded", String(shouldOpen));
  elements.qrPanel.hidden = !shouldOpen;
  if (shouldOpen && currentConversion) renderQr(currentConversion.convertedUrl);
}

function renderQr(value) {
  if (renderedQrValue === value && elements.qrCode.childElementCount) return;
  renderedQrValue = value;
  elements.qrCode.replaceChildren();

  if (typeof window.QRCode !== "function") {
    const message = document.createElement("span");
    message.textContent = "Không thể tạo mã QR";
    elements.qrCode.append(message);
    return;
  }

  new window.QRCode(elements.qrCode, {
    text: value,
    width: 140,
    height: 140,
    colorDark: "#11120f",
    colorLight: "#ffffff",
    correctLevel: window.QRCode.CorrectLevel.M,
  });
}

function resetQr() {
  renderedQrValue = "";
  elements.qrCode.replaceChildren();
  elements.qrPanel.hidden = true;
  elements.qrToggle.setAttribute("aria-expanded", "false");
}

async function loadHistory() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.history);
    historyItems = Array.isArray(stored[STORAGE_KEYS.history])
      ? stored[STORAGE_KEYS.history].slice(0, MAX_HISTORY_ITEMS)
      : [];
  } catch {
    historyItems = [];
  }
  renderHistory();
}

async function saveToHistory(conversion) {
  const item = {
    id: crypto.randomUUID(),
    platformKey: conversion.platformKey,
    originalUrl: conversion.originalUrl,
    convertedUrl: conversion.convertedUrl,
    createdAt: new Date().toISOString(),
  };
  historyItems = [
    item,
    ...historyItems.filter((historyItem) => historyItem.convertedUrl !== item.convertedUrl),
  ].slice(0, MAX_HISTORY_ITEMS);
  await persistHistory();
  renderHistory();
}

async function persistHistory() {
  await chrome.storage.local.set({ [STORAGE_KEYS.history]: historyItems });
}

function renderHistory() {
  elements.historyList.replaceChildren();
  elements.historySection.hidden = historyItems.length === 0;

  historyItems.forEach((item) => {
    const platform = PLATFORM_MAP[item.platformKey];
    if (!platform) return;

    const article = document.createElement("article");
    article.className = "history-item";

    const icon = document.createElement("span");
    icon.className = "history-icon";
    icon.textContent = platform.icon;
    icon.title = platform.name;

    const copy = document.createElement("div");
    copy.className = "history-copy";
    const name = document.createElement("strong");
    name.textContent = platform.name;
    const url = document.createElement("span");
    url.textContent = item.convertedUrl;
    url.title = item.convertedUrl;
    copy.append(name, url);

    const actions = document.createElement("div");
    actions.className = "history-actions";
    actions.append(
      createHistoryButton("⧉", `Sao chép URL ${platform.name}`, () => copyText(item.convertedUrl)),
      createHistoryButton("↗", `Mở URL ${platform.name}`, () => chrome.tabs.create({ url: item.convertedUrl })),
    );

    article.append(icon, copy, actions);
    elements.historyList.append(article);
  });
}

function createHistoryButton(symbol, label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = symbol;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", handler);
  return button;
}

async function clearHistory() {
  historyItems = [];
  await persistHistory();
  renderHistory();
  showToast("Đã xóa lịch sử");
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(historyItems, null, 2)], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = `embedfix-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  showToast("Đã xuất lịch sử");
}

async function importHistory(file) {
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("History must be an array");

    const validItems = imported.flatMap((item) => {
      if (!item || typeof item.originalUrl !== "string" || typeof item.convertedUrl !== "string") return [];
      const conversion = convertUrl(item.originalUrl);
      if (!conversion.ok || conversion.convertedUrl !== item.convertedUrl) return [];
      return [{
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        platformKey: conversion.platformKey,
        originalUrl: conversion.originalUrl,
        convertedUrl: conversion.convertedUrl,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      }];
    });

    historyItems = [...validItems, ...historyItems]
      .filter((item, index, allItems) => allItems.findIndex((entry) => entry.convertedUrl === item.convertedUrl) === index)
      .slice(0, MAX_HISTORY_ITEMS);
    await persistHistory();
    renderHistory();
    showToast(`Đã nhập ${validItems.length} mục lịch sử`);
  } catch {
    showToast("Tệp lịch sử không hợp lệ");
  } finally {
    elements.importInput.value = "";
  }
}

function renderPlatforms() {
  Object.values(PLATFORM_MAP).forEach((platform) => {
    const chip = document.createElement("span");
    chip.className = "platform-chip";
    chip.textContent = `${platform.icon} ${platform.name}`;
    elements.platformList.append(chip);
  });
}

async function initializeTheme() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.theme);
  currentTheme = THEME_SEQUENCE.includes(stored[STORAGE_KEYS.theme]) ? stored[STORAGE_KEYS.theme] : "auto";
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  const resolvedTheme = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  elements.root.dataset.theme = theme;
  elements.root.dataset.resolvedTheme = resolvedTheme;
  elements.themeIcon.textContent = THEME_ICONS[theme];
  elements.themeButton.title = `Giao diện: ${THEME_LABELS[theme]}`;
  elements.themeButton.setAttribute("aria-label", `Đang dùng giao diện ${THEME_LABELS[theme]}. Nhấn để đổi.`);
}

async function cycleTheme() {
  const currentIndex = THEME_SEQUENCE.indexOf(currentTheme);
  currentTheme = THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];
  const applyCurrentTheme = () => applyTheme(currentTheme);
  if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const rect = elements.themeButton.getBoundingClientRect();
    elements.root.style.setProperty("--theme-switch-x", `${Math.round(rect.left + rect.width / 2)}px`);
    elements.root.style.setProperty("--theme-switch-y", `${Math.round(rect.top + rect.height / 2)}px`);
    elements.root.classList.add("theme-transition");
    const transition = document.startViewTransition(applyCurrentTheme);
    await transition.finished.finally(() => elements.root.classList.remove("theme-transition"));
  } else {
    applyCurrentTheme();
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.theme]: currentTheme });
  showToast(`Giao diện: ${THEME_LABELS[currentTheme]}`);
}

async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !/^https?:/i.test(tab.url)) {
      elements.input.focus();
      return;
    }
    elements.input.value = tab.url;
    handleInput();
  } catch {
    elements.input.focus();
  }
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
    const text = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain");
    if (!text) return;
    elements.input.value = text.trim().split(/\r?\n/)[0];
    handleInput();
  });
}

function bindEvents() {
  elements.input.addEventListener("input", handleInput);
  elements.clearButton.addEventListener("click", clearConverter);
  elements.themeButton.addEventListener("click", cycleTheme);
  elements.copyButton.addEventListener("click", async () => {
    if (!currentConversion) return;
    await commitCurrentConversion();
    await copyText(currentConversion.convertedUrl);
  });
  elements.copyOriginalButton.addEventListener("click", async () => {
    if (!currentConversion) return;
    await commitCurrentConversion();
    await copyText(currentConversion.originalUrl, "Đã sao chép URL gốc!");
  });
  elements.openButton.addEventListener("click", openCurrent);
  elements.shareButton.addEventListener("click", shareCurrent);
  elements.qrToggle.addEventListener("click", toggleQr);
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.exportButton.addEventListener("click", exportHistory);
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.importInput.addEventListener("change", () => importHistory(elements.importInput.files[0]));

  document.addEventListener("keydown", (event) => {
    const commandKey = event.ctrlKey || event.metaKey;
    if (commandKey && !event.shiftKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      elements.input.focus();
      elements.input.select();
    }
    if (commandKey && event.shiftKey && event.key.toLowerCase() === "c" && currentConversion) {
      event.preventDefault();
      commitCurrentConversion().then(() => copyText(currentConversion.convertedUrl));
    }
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentTheme === "auto") applyTheme("auto");
  });
}

async function initialize() {
  await initializeTheme();
  renderPlatforms();
  bindEvents();
  initializeDragAndDrop();
  elements.shareButton.hidden = typeof navigator.share !== "function";
  await loadHistory();
  await loadCurrentTab();
}

initialize();
