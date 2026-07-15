import { convertUrl } from "./core/converter.js";

const MENU_IDS = Object.freeze({
  copy: "embedfix-copy",
  open: "embedfix-open",
});
const HISTORY_KEY = "embedfixHistory";
const MAX_HISTORY_ITEMS = 20;
const OFFSCREEN_PATH = "offscreen.html";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_IDS.copy,
      title: "Sao chép URL nhúng tối ưu",
      contexts: ["page", "link"],
    });
    chrome.contextMenus.create({
      id: MENU_IDS.open,
      title: "Mở URL nhúng tối ưu",
      contexts: ["page", "link"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  const sourceUrl = info.linkUrl || info.pageUrl;
  const conversion = convertUrl(sourceUrl);

  if (!conversion.ok) {
    await showTemporaryBadge("!");
    return;
  }

  await saveToHistory(conversion);
  if (info.menuItemId === MENU_IDS.open) {
    await chrome.tabs.create({ url: conversion.convertedUrl });
  }
  if (info.menuItemId === MENU_IDS.copy) {
    const copied = await copyWithOffscreenDocument(conversion.convertedUrl);
    await showTemporaryBadge(copied ? "✓" : "!");
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "copy-fix-url") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const conversion = convertUrl(tab?.url);
  if (!conversion.ok) {
    await showTemporaryBadge("!");
    return;
  }

  const copied = await copyWithOffscreenDocument(conversion.convertedUrl);
  if (copied) await saveToHistory(conversion);
  await showTemporaryBadge(copied ? "✓" : "!");
});

async function copyWithOffscreenDocument(text) {
  try {
    await ensureOffscreenDocument();
    const response = await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "COPY_TO_CLIPBOARD",
      text,
    });
    return Boolean(response?.ok);
  } catch (error) {
    console.error("EmbedFix clipboard error:", error);
    return false;
  }
}

async function ensureOffscreenDocument() {
  if (typeof chrome.offscreen.hasDocument === "function" && await chrome.offscreen.hasDocument()) return;
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["CLIPBOARD"],
      justification: "Copy the user-requested converted URL to the clipboard",
    });
  } catch (error) {
    if (!String(error?.message).includes("single offscreen document")) throw error;
  }
}

async function saveToHistory(conversion) {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const currentHistory = Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [];
  const item = {
    id: crypto.randomUUID(),
    platformKey: conversion.platformKey,
    originalUrl: conversion.originalUrl,
    convertedUrl: conversion.convertedUrl,
    createdAt: new Date().toISOString(),
  };
  const nextHistory = [
    item,
    ...currentHistory.filter((historyItem) => historyItem.convertedUrl !== item.convertedUrl),
  ].slice(0, MAX_HISTORY_ITEMS);
  await chrome.storage.local.set({ [HISTORY_KEY]: nextHistory });
}

async function showTemporaryBadge(text) {
  await chrome.action.setBadgeBackgroundColor({ color: text === "✓" ? "#7a9200" : "#c54949" });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1500);
}
