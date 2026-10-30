import * as htmlToImage from 'html-to-image';
import '/js/icons.js';

const SUN_ICON = `<animate-icons name="sun" size="24"></animate-icons>`;
const MOON_ICON = `<animate-icons name="moon" size="24"></animate-icons>`;

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeQuery(query) {
  return (query || "")
    .replace(/["']/g, "")
    .replace(/[,;–—\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHighQualityCover(url) {
  if (!url) return "";
  let hq = url;
  if (hq.includes("dzcdn.net")) {
    hq = hq.replace(/\b(56x56|120x120|250x250|500x500)\b/g, "1000x1000");
  } else if (hq.includes("mzstatic.com")) {
    hq = hq.replace(/\b\d+x\d+bb\b/g, "1000x1000bb");
  } else if (hq.includes("i.scdn.co")) {
    hq = hq.replace(/ab67616d0000(1e02|4851)/g, "ab67616d0000b273");
  }
  return hq;
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fetchDeezerJsonp(type, query) {
  return new Promise((resolve) => {
    const callbackName = "deezer_lyrics_cb_" + Math.random().toString(36).substring(2);
    const script = document.createElement("script");

    const timer = setTimeout(() => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(null);
    }, 6000);

    window[callbackName] = (data) => {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
      resolve(data);
    };

    const cleanQuery = (query || "").replace(/["']/g, "").trim();
    script.src = `https://api.deezer.com/search/${type}?q=${encodeURIComponent(cleanQuery)}&output=jsonp&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
      resolve(null);
    };
    document.body.appendChild(script);
  });
}

async function fetchItunesSongs(query) {
  try {
    const clean = sanitizeQuery(query);
    if (!clean) return [];
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=song&limit=10`
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.results || []).map((item) => ({
      type: "song",
      id: item.trackId,
      title: item.trackName || "",
      artist: item.artistName || "",
      cover: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "400x400bb") : "",
      coverHq: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "1000x1000bb") : "",
      album: item.collectionName || "",
    }));
  } catch {
    return [];
  }
}

async function searchSongs(rawQuery) {
  if (!rawQuery) return [];

  const sanitized = sanitizeQuery(rawQuery);
  if (!sanitized) return [];

  let tracks = [];

  if (rawQuery.includes(",") || rawQuery.includes("-")) {
    const parts = rawQuery
      .split(/[,-]/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      const p1 = parts[0];
      const p2 = parts[1];

      const [advRes1, advRes2, generalRes] = await Promise.all([
        fetchDeezerJsonp("track", `track:"${p1}" artist:"${p2}"`),
        fetchDeezerJsonp("track", `track:"${p2}" artist:"${p1}"`),
        fetchDeezerJsonp("track", sanitized),
      ]);

      const pool = [
        ...(advRes1?.data || []),
        ...(advRes2?.data || []),
        ...(generalRes?.data || []),
      ];

      const seen = new Set();
      tracks = pool
        .filter((t) => {
          if (!t || !t.id || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        })
        .map((t) => ({
          type: "song",
          id: t.id,
          title: t.title || t.title_short || "",
          artist: t.artist?.name || "",
          cover: t.album?.cover_medium || t.album?.cover_big || t.album?.cover || "",
          coverHq: t.album?.cover_xl || (t.album?.cover_big ? t.album.cover_big.replace("500x500", "1000x1000") : "") || t.album?.cover_medium || "",
          album: t.album?.title || "",
        }));
    }
  }

  if (tracks.length === 0) {
    const generalRes = await fetchDeezerJsonp("track", sanitized);
    tracks = (generalRes?.data || []).map((t) => ({
      type: "song",
      id: t.id,
      title: t.title || t.title_short || "",
      artist: t.artist?.name || "",
      cover: t.album?.cover_medium || t.album?.cover_big || t.album?.cover || "",
      coverHq: t.album?.cover_xl || (t.album?.cover_big ? t.album.cover_big.replace("500x500", "1000x1000") : "") || t.album?.cover_medium || "",
      album: t.album?.title || "",
    }));
  }

  if (tracks.length === 0) {
    tracks = await fetchItunesSongs(rawQuery);
  }

  return tracks.slice(0, 5);
}

async function fetchLyricsFromLRCLIB(track, artist) {
  try {
    const cleanTrack = (track || "").trim();
    const cleanArtist = (artist || "").trim();
    const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    const res = await fetch(getUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.plainLyrics) return data.plainLyrics;
      if (data.syncedLyrics) {
        return data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/g, "").trim();
      }
    }
  } catch (error) {
    if (typeof umami !== "undefined") {
      umami.track("api_error", {
        tool: "lyrics",
        reason: error.message || "user_not_found",
      });
    }
  }

  try {
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${track} ${artist}`)}`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const item = list.find((i) => i.plainLyrics || i.syncedLyrics) || list[0];
        if (item.plainLyrics) return item.plainLyrics;
        if (item.syncedLyrics) {
          return item.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/g, "").trim();
        }
      }
    }
  } catch (error) {
    if (typeof umami !== "undefined") {
      umami.track("api_error", {
        tool: "lyrics",
        reason: error.message || "user_not_found",
      });
    }
  }

  try {
    const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
    const res = await fetch(ovhUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.lyrics) return data.lyrics;
    }
  } catch (error) {
    if (typeof umami !== "undefined") {
      umami.track("api_error", {
        tool: "lyrics",
        reason: error.message || "user_not_found",
      });
    }
  }

  return null;
}

function getUserLanguage() {
  const lang = (navigator.language || navigator.userLanguage || "pt").toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("it")) return "it";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("ru")) return "ru";
  if (lang.startsWith("en")) return "en";
  return "pt";
}

let currentTargetLang = getUserLanguage();

async function requestTranslation(text, targetLang) {
  const lang = targetLang || currentTargetLang || "pt";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const full = json[0]
          .map((item) => (item && item[0] ? item[0] : ""))
          .join("");
        if (full && full.trim()) return full;
      }
    }
  } catch {}

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${encodeURIComponent(lang)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json && json.responseData && json.responseData.translatedText) {
        return json.responseData.translatedText;
      }
    }
  } catch {}

  return null;
}

async function translateLyricsLines(lines, targetLang = currentTargetLang) {
  const lang = targetLang || currentTargetLang || "pt";
  const chunkSize = 8;
  const results = new Array(lines.length).fill("");

  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const textToTranslate = chunk
      .map((line, idx) => `${idx + 1}. ${line}`)
      .join("\n");

    const translatedText = await requestTranslation(textToTranslate, lang);
    const translatedChunk = new Array(chunk.length).fill("");

    if (translatedText) {
      const tLines = translatedText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      tLines.forEach((tLine) => {
        const match = tLine.match(/^\s*(\d+)[\.\)\:\-]\s*(.*)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 1 && num <= chunk.length && match[2].trim()) {
            translatedChunk[num - 1] = match[2].trim();
          }
        }
      });

      if (translatedChunk.some((line) => !line)) {
        if (tLines.length === chunk.length) {
          tLines.forEach((tLine, idx) => {
            if (!translatedChunk[idx]) {
              translatedChunk[idx] = tLine.replace(/^\s*\d+[\.\)\:\-]\s*/, "").trim();
            }
          });
        }
      }
    }

    for (let j = 0; j < chunk.length; j++) {
      results[i + j] =
        translatedChunk[j] && translatedChunk[j].trim()
          ? translatedChunk[j]
          : chunk[j];
    }

    if (i + chunkSize < lines.length) {
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  return results;
}

let currentTrack = null;
let originalLines = [];
let translatedLines = null;
let isTranslated = false;
let selectedIndices = new Set();

let currentLayout = "solid";
let currentFormat = "card";
let isBlackText = false;
let isBilingual = true;
let customColor = null;
let currentService = "lastfm";
let extractedDominant = { hex: "#2b2f3a", darkerHex: "#171a21" };

const CACHE_KEY = "bubblefm_lyrics_cache";

function saveLyricsState(stepOverride) {
  if (!currentTrack) return;
  const stepLayout = document.getElementById("stepLayout");
  const stepSelect = document.getElementById("stepSelect");
  const currentVisibleStep =
    stepOverride ||
    (stepLayout && stepLayout.style.display !== "none"
      ? "layout"
      : stepSelect && stepSelect.style.display !== "none"
      ? "select"
      : "results");

  const state = {
    searchQuery: new URLSearchParams(window.location.search).get("search") || "",
    step: currentVisibleStep,
    track: currentTrack,
    originalLines,
    translatedLines,
    isTranslated,
    selectedIndices: Array.from(selectedIndices),
    layout: currentLayout,
    format: currentFormat,
    blackText: isBlackText,
    bilingual: isBilingual,
    customColor,
    service: currentService,
    targetLang: currentTargetLang,
  };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {}
}

function restoreLyricsStateIfAvailable(currentQuery) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (!state || !state.track) return false;
    if (currentQuery && state.searchQuery && state.searchQuery.toLowerCase() !== currentQuery.toLowerCase()) {
      sessionStorage.removeItem(CACHE_KEY);
      return false;
    }
    if (state.step === "results") {
      return false;
    }

    currentTrack = state.track;
    originalLines = state.originalLines || [];
    translatedLines = state.translatedLines || null;
    isTranslated = !!state.isTranslated;
    selectedIndices = new Set(state.selectedIndices || []);
    currentLayout = state.layout || "solid";
    currentFormat = state.format || "card";
    isBlackText = !!state.blackText;
    isBilingual = state.bilingual !== false;
    customColor = state.customColor || null;
    currentService = state.service || "lastfm";
    currentTargetLang = state.targetLang || getUserLanguage();

    const langSelectEl = document.getElementById("lyricsLangSelect");
    if (langSelectEl) langSelectEl.value = currentTargetLang;

    const serviceSelectEl = document.getElementById("lyricsServiceSelect");
    if (serviceSelectEl) serviceSelectEl.value = currentService;

    const blackTextSwitchEl = document.getElementById("lyricsBlackTextSwitch");
    if (blackTextSwitchEl) blackTextSwitchEl.checked = isBlackText;

    const bilingualSwitchEl = document.getElementById("lyricsBilingualSwitch");
    if (bilingualSwitchEl) bilingualSwitchEl.checked = isBilingual;

    const colorPickerBtn = document.getElementById("btnLyricsColorPicker");
    const colorInput = document.getElementById("lyricsColorInput");
    const resetColorBtn = document.getElementById("btnResetLyricsColor");
    if (customColor) {
      if (colorInput) colorInput.value = customColor;
      if (colorPickerBtn) {
        colorPickerBtn.style.backgroundColor = customColor;
        colorPickerBtn.style.borderColor = customColor;
      }
      if (resetColorBtn) resetColorBtn.style.display = "flex";
    }

    const formatSegmented = document.getElementById("lyricsFormatSegmented");
    if (formatSegmented) {
      formatSegmented.querySelectorAll(".segment-btn").forEach((b) =>
        b.classList.toggle("active", b.dataset.format === currentFormat)
      );
    }

    const titleEl = document.getElementById("trackTitleDisplay");
    const artistEl = document.getElementById("trackArtistDisplay");
    const coverEl = document.getElementById("trackCoverThumb");
    const translateBtn = document.getElementById("btnTranslateToggle");

    if (titleEl) titleEl.textContent = currentTrack.title;
    if (artistEl) artistEl.textContent = currentTrack.artist;
    if (coverEl) coverEl.src = currentTrack.cover || "/logo.svg";
    if (translateBtn) translateBtn.classList.toggle("active", isTranslated);

    const targetStep = state.step || "select";
    showStep(targetStep);

    if (targetStep === "select") {
      renderSelectLines();
    } else if (targetStep === "layout") {
      prepareAndShowLayoutStep();
    }
    return true;
  } catch {
    return false;
  }
}

function showStep(stepName) {
  const stepResults = document.getElementById("stepResults");
  const stepSelect = document.getElementById("stepSelect");
  const stepLayout = document.getElementById("stepLayout");

  if (stepResults) stepResults.style.display = "none";
  if (stepSelect) stepSelect.style.display = "none";
  if (stepLayout) stepLayout.style.display = "none";

  const target =
    stepName === "results"
      ? stepResults
      : stepName === "select"
      ? stepSelect
      : stepLayout;

  if (target) {
    target.style.display = "flex";
    target.classList.remove("fade-in");
    void target.offsetWidth;
    target.classList.add("fade-in");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  updateScrollDownVisibility();
  setTimeout(updateScrollDownVisibility, 100);
  saveLyricsState(stepName);
}

function updateScrollDownVisibility() {
  const scrollDownBtn = document.getElementById("btnScrollDownLyrics");
  const stepSelect = document.getElementById("stepSelect");
  if (!scrollDownBtn || !stepSelect) return;

  if (stepSelect.style.display === "none") {
    scrollDownBtn.style.display = "none";
    return;
  }

  scrollDownBtn.style.display = "flex";
  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  if (docHeight - (scrollY + windowHeight) < 140) {
    scrollDownBtn.style.opacity = "0";
    scrollDownBtn.style.pointerEvents = "none";
  } else {
    scrollDownBtn.style.opacity = "1";
    scrollDownBtn.style.pointerEvents = "auto";
  }
}

function renderSelectLines() {
  const linesWrapper = document.getElementById("lyricsLinesWrapper");
  const countDisplay = document.getElementById("lyricsCountDisplay");
  if (!linesWrapper) return;

  if (!originalLines || originalLines.length === 0) {
    linesWrapper.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 0;">
        <p style="color: var(--color-text-muted);">No lyrics found for this song.</p>
      </div>
    `;
    if (countDisplay) countDisplay.textContent = "0 / 5";
    return;
  }

  const existingItems = linesWrapper.querySelectorAll(".lyric-line-item");
  if (existingItems.length === originalLines.length) {
    existingItems.forEach((el, idx) => {
      const orig = originalLines[idx];
      const isSelected = selectedIndices.has(idx);
      el.className = `lyric-line-item ${isSelected ? "selected" : ""}`;
      if (isTranslated && translatedLines) {
        const trans = translatedLines[idx] || orig;
        el.innerHTML = `
          <span class="lyric-line-original">${escapeHTML(orig)}</span>
          <span class="lyric-line-translated">${escapeHTML(trans)}</span>
        `;
      } else {
        el.innerHTML = `
          <span class="lyric-line-text">${escapeHTML(orig)}</span>
        `;
      }
    });
    if (countDisplay) {
      countDisplay.textContent = `${selectedIndices.size} / 5`;
    }
    return;
  }

  linesWrapper.innerHTML = originalLines
    .map((orig, idx) => {
      const isSelected = selectedIndices.has(idx);
      if (isTranslated && translatedLines) {
        const trans = translatedLines[idx] || orig;
        return `
          <div class="lyric-line-item ${isSelected ? "selected" : ""}" data-index="${idx}">
            <span class="lyric-line-original">${escapeHTML(orig)}</span>
            <span class="lyric-line-translated">${escapeHTML(trans)}</span>
          </div>
        `;
      }
      return `
        <div class="lyric-line-item ${isSelected ? "selected" : ""}" data-index="${idx}">
          <span class="lyric-line-text">${escapeHTML(orig)}</span>
        </div>
      `;
    })
    .join("");

  linesWrapper.querySelectorAll(".lyric-line-item").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.index, 10);
      if (selectedIndices.has(idx)) {
        selectedIndices.delete(idx);
        el.classList.remove("selected");
      } else {
        if (selectedIndices.size < 5) {
          selectedIndices.add(idx);
          el.classList.add("selected");
        }
      }
      if (countDisplay) {
        countDisplay.textContent = `${selectedIndices.size} / 5`;
      }
      saveLyricsState("select");
    });
  });

  if (countDisplay) {
    countDisplay.textContent = `${selectedIndices.size} / 5`;
  }
  setTimeout(updateScrollDownVisibility, 50);
}

async function loadTrackLyrics(item) {
  const hqCover = getHighQualityCover(item.coverHq || item.cover);
  item.cover = hqCover;
  item.coverHq = hqCover;
  preloadImage(hqCover);

  currentTrack = item;
  originalLines = [];
  translatedLines = null;
  isTranslated = false;
  selectedIndices.clear();

  const titleEl = document.getElementById("trackTitleDisplay");
  const artistEl = document.getElementById("trackArtistDisplay");
  const coverEl = document.getElementById("trackCoverThumb");
  const linesWrapper = document.getElementById("lyricsLinesWrapper");
  const translateBtn = document.getElementById("btnTranslateToggle");

  if (titleEl) titleEl.textContent = item.title;
  if (artistEl) artistEl.textContent = item.artist;
  if (coverEl) coverEl.src = item.cover || "/logo.svg";
  if (translateBtn) translateBtn.classList.remove("active");

  const langSelectEl = document.getElementById("lyricsLangSelect");
  if (langSelectEl) langSelectEl.value = currentTargetLang;

  if (linesWrapper) {
    linesWrapper.innerHTML = `
      <div class="lyric-line-item skeleton" style="height: 48px; opacity: 0.6;"></div>
      <div class="lyric-line-item skeleton" style="height: 48px; opacity: 0.5;"></div>
      <div class="lyric-line-item skeleton" style="height: 48px; opacity: 0.4;"></div>
      <div class="lyric-line-item skeleton" style="height: 48px; opacity: 0.3;"></div>
      <div class="lyric-line-item skeleton" style="height: 48px; opacity: 0.2;"></div>
    `;
  }

  showStep("select");

  const rawLyrics = await fetchLyricsFromLRCLIB(item.title, item.artist);
  if (rawLyrics) {
    originalLines = rawLyrics
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  } else {
    originalLines = [];
  }

  renderSelectLines();
  saveLyricsState("select");
}

document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const currentTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
  setTheme(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "light" : "dark");
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (themeToggle) {
      themeToggle.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
    }
  }

  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const homeHeader = document.querySelector(".home-header");
  if (mobileMenuBtn && homeHeader) {
    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      homeHeader.classList.toggle("menu-open");
    });

    document.addEventListener("click", (e) => {
      if (!homeHeader.contains(e.target)) {
        homeHeader.classList.remove("menu-open");
      }
    });

    const navLinks = homeHeader.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        homeHeader.classList.remove("menu-open");
      });
    });
  }

  const formLyrics = document.getElementById("form-lyrics");
  if (formLyrics) {
    formLyrics.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("lyricsInput");
      const query = input ? input.value.trim() : "";
      if (query) {
        if (typeof umami !== "undefined") {
          umami.track("search_initiated", { tool: "lyrics" });
        }
        try {
          sessionStorage.removeItem(CACHE_KEY);
        } catch {}
        window.location.href = `result.html?search=${encodeURIComponent(query)}`;
      }
    });
  }

  const featureSections = document.querySelectorAll(".landing-features .feature-section");
  if (featureSections.length > 0) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      featureSections.forEach((section) => observer.observe(section));
    } else {
      featureSections.forEach((section) => section.classList.add("is-visible"));
    }
  }

  const resultsGrid = document.getElementById("lyricsResultsGrid");
  if (resultsGrid) {
    initResultsPage(resultsGrid);
  }

  const langSelect = document.getElementById("lyricsLangSelect");
  if (langSelect) {
    langSelect.value = currentTargetLang;
    langSelect.addEventListener("change", async (e) => {
      currentTargetLang = e.target.value;
      saveLyricsState();

      if (isTranslated && originalLines.length > 0) {
        const translateBtn = document.getElementById("btnTranslateToggle");
        const textSpan = translateBtn ? translateBtn.querySelector("span") : null;
        if (translateBtn) translateBtn.disabled = true;
        if (textSpan) textSpan.textContent = "Translating...";

        translatedLines = await translateLyricsLines(originalLines, currentTargetLang);

        if (translateBtn) translateBtn.disabled = false;
        if (textSpan) textSpan.textContent = "Translate";

        if (typeof umami !== "undefined") {
          umami.track("Lyrics Translation Language Changed", { language: currentTargetLang });
        }

        renderSelectLines();
        saveLyricsState("select");
      } else {
        translatedLines = null;
      }
    });
  }

  const translateBtn = document.getElementById("btnTranslateToggle");
  if (translateBtn) {
    translateBtn.addEventListener("click", async () => {
      if (originalLines.length === 0) return;

      if (!translatedLines) {
        translateBtn.disabled = true;
        const textSpan = translateBtn.querySelector("span");
        if (textSpan) textSpan.textContent = "Translating...";

        translatedLines = await translateLyricsLines(originalLines, currentTargetLang);
        translateBtn.disabled = false;
        if (textSpan) textSpan.textContent = "Translate";
      }

      if (translatedLines) {
        isTranslated = !isTranslated;
        translateBtn.classList.toggle("active", isTranslated);
        if (typeof umami !== "undefined") {
          umami.track("Lyrics Translation Toggled", {
            translated: isTranslated,
            language: currentTargetLang,
          });
        }
        renderSelectLines();
        saveLyricsState("select");
      }
    });
  }

  const backToResultsBtn = document.getElementById("btnBackToResults");
  if (backToResultsBtn) {
    backToResultsBtn.addEventListener("click", () => {
      showStep("results");
      saveLyricsState("results");
    });
  }

  const continueBtn = document.getElementById("btnContinue");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      prepareAndShowLayoutStep();
      saveLyricsState("layout");
    });
  }

  const scrollDownBtn = document.getElementById("btnScrollDownLyrics");
  if (scrollDownBtn) {
    scrollDownBtn.addEventListener("click", () => {
      const continueBtn = document.getElementById("btnContinue");
      if (continueBtn) {
        continueBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    });

    window.addEventListener("scroll", updateScrollDownVisibility, { passive: true });
    window.addEventListener("resize", updateScrollDownVisibility, { passive: true });
  }

  const formatSegmented = document.getElementById("lyricsFormatSegmented");
  if (formatSegmented) {
    formatSegmented.querySelectorAll(".segment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fmt = btn.dataset.format;
        if (fmt === currentFormat) return;
        currentFormat = fmt;
        formatSegmented.querySelectorAll(".segment-btn").forEach((b) => b.classList.toggle("active", b.dataset.format === fmt));
        if (typeof umami !== "undefined") {
          umami.track("Lyrics Format Selected", { format: fmt });
        }
        renderLayouts();
        saveLyricsState("layout");
      });
    });
  }

  const openPersonalizeBtn = document.getElementById("btnOpenPersonalize");
  const personalizeModal = document.getElementById("lyricsPersonalizeModal");
  const closePersonalizeBtn = document.getElementById("btnClosePersonalize");
  const donePersonalizeBtn = document.getElementById("btnDonePersonalize");

  const trackLyricsConfigSaved = () => {
    if (typeof umami !== "undefined") {
      umami.track("Lyrics Config Saved", {
        service: currentService,
        black_text: isBlackText,
        bilingual: isBilingual,
        custom_color: Boolean(customColor),
      });
    }
  };

  if (openPersonalizeBtn && personalizeModal) {
    openPersonalizeBtn.addEventListener("click", () => {
      personalizeModal.classList.add("show");
      if (typeof umami !== "undefined") {
        umami.track("modal_opened", {
          modal: "lyrics_config",
          tool: "lyrics",
        });
      }
    });
  }

  if (closePersonalizeBtn && personalizeModal) {
    closePersonalizeBtn.addEventListener("click", () => {
      personalizeModal.classList.remove("show");
      trackLyricsConfigSaved();
    });
  }

  if (donePersonalizeBtn && personalizeModal) {
    donePersonalizeBtn.addEventListener("click", () => {
      personalizeModal.classList.remove("show");
      trackLyricsConfigSaved();
    });
  }

  if (personalizeModal) {
    personalizeModal.addEventListener("click", (e) => {
      if (e.target === personalizeModal) {
        personalizeModal.classList.remove("show");
        trackLyricsConfigSaved();
      }
    });
  }

  const serviceSelectEl = document.getElementById("lyricsServiceSelect");
  if (serviceSelectEl) {
    serviceSelectEl.addEventListener("change", (e) => {
      currentService = e.target.value;
      if (typeof umami !== "undefined") {
        umami.track("Service Selected", {
          service: currentService,
          tool: "lyrics",
        });
      }
      renderLayouts();
      saveLyricsState("layout");
    });
  }

  const blackTextSwitchEl = document.getElementById("lyricsBlackTextSwitch");
  if (blackTextSwitchEl) {
    blackTextSwitchEl.addEventListener("change", (e) => {
      isBlackText = e.target.checked;
      renderLayouts();
      saveLyricsState("layout");
    });
  }

  const bilingualSwitchEl = document.getElementById("lyricsBilingualSwitch");
  if (bilingualSwitchEl) {
    bilingualSwitchEl.addEventListener("change", (e) => {
      isBilingual = e.target.checked;
      renderLayouts();
      saveLyricsState("layout");
    });
  }

  const colorPickerBtn = document.getElementById("btnLyricsColorPicker");
  const colorInput = document.getElementById("lyricsColorInput");
  const resetColorBtn = document.getElementById("btnResetLyricsColor");

  if (colorPickerBtn && colorInput) {
    colorPickerBtn.addEventListener("click", () => {
      colorInput.click();
    });
    colorInput.addEventListener("input", (e) => {
      customColor = e.target.value;
      colorPickerBtn.style.backgroundColor = customColor;
      colorPickerBtn.style.borderColor = customColor;
      if (resetColorBtn) resetColorBtn.style.display = "flex";
      renderLayouts();
      saveLyricsState("layout");
    });
  }

  if (resetColorBtn && colorPickerBtn) {
    resetColorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      customColor = null;
      colorPickerBtn.style.backgroundColor = "";
      colorPickerBtn.style.borderColor = "";
      resetColorBtn.style.display = "none";
      renderLayouts();
      saveLyricsState("layout");
    });
  }

  const backToSelectBtn = document.getElementById("btnBackToSelect");
  if (backToSelectBtn) {
    backToSelectBtn.addEventListener("click", () => {
      showStep("select");
    });
  }

  const downloadCardBtn = document.getElementById("btnDownloadCard");
  if (downloadCardBtn) {
    downloadCardBtn.addEventListener("click", () => {
      exportSelectedLyricsImage();
    });
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link || !link.href || typeof umami === "undefined") return;

    if (link.href.includes("buymeacoffee.com")) {
      umami.track("Outbound Click", { destination: "buymeacoffee" });
    } else if (link.href.includes("github.com")) {
      umami.track("Outbound Click", { destination: "github" });
    }
  });
});

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex) {
  const clean = hex.replace(/^#/, "");
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function darkenHex(hex, factor = 0.35) {
  const { r, g, b } = hexToRgb(hex);
  const dr = Math.max(0, Math.min(255, Math.round(r * (1 - factor))));
  const dg = Math.max(0, Math.min(255, Math.round(g * (1 - factor))));
  const db = Math.max(0, Math.min(255, Math.round(b * (1 - factor))));
  return rgbToHex(dr, dg, db);
}

function extractDominantColor(imgSrc) {
  return new Promise((resolve) => {
    const fallback = { hex: "#2b2f3a", darkerHex: "#171a21" };
    if (!imgSrc) return resolve(fallback);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        const buckets = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 245 || brightness < 15) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;

          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          buckets[key] = (buckets[key] || 0) + (1 + sat * 2);
          totalR += r;
          totalG += g;
          totalB += b;
          count++;
        }

        let bestKey = null;
        let maxWeight = 0;
        for (const [k, w] of Object.entries(buckets)) {
          if (w > maxWeight) {
            maxWeight = w;
            bestKey = k;
          }
        }

        let r = 43, g = 47, b = 58;
        if (bestKey) {
          [r, g, b] = bestKey.split(",").map(Number);
        } else if (count > 0) {
          r = Math.round(totalR / count);
          g = Math.round(totalG / count);
          b = Math.round(totalB / count);
        }

        const maxBrightness = 138;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness > maxBrightness) {
          const factor = maxBrightness / brightness;
          r = Math.round(r * factor);
          g = Math.round(g * factor);
          b = Math.round(b * factor);
        }

        const hex = rgbToHex(r, g, b);
        const darkerHex = darkenHex(hex, 0.4);
        resolve({ hex, darkerHex });
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = imgSrc;
  });
}

function clampHexBrightness(hexColor, maxB = 138) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor;
  const b = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  if (b > maxB) {
    const factor = maxB / b;
    return rgbToHex(
      Math.round(rgb.r * factor),
      Math.round(rgb.g * factor),
      Math.round(rgb.b * factor)
    );
  }
  return hexColor;
}

function getServiceLogoSvg(service) {
  switch (service) {
    case "applemusic":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50" style="fill:currentColor"><path d="M83.57 48.49V15.95h-.24L70.31 48.49h-5.06L52.23 15.95h-.24v32.54h-6.03V4.37h7.72l13.98 35.2h.24l13.98-35.2h7.96v44.12zm40.25 0h-6.27v-5.55h-.24c-1.68 3.86-5.06 6.03-9.88 6.03-6.99 0-11.09-4.58-11.09-12.05V16.19h6.51v19.52c0 4.82 2.41 7.48 6.75 7.48 4.82 0 7.47-3.38 7.47-8.44V16.19h6.51zm17.84-32.79c7.47 0 12.05 4.1 12.29 10.13h-6.02c-.48-3.14-2.65-5.07-6.27-5.07s-6.03 1.69-6.03 4.34c0 1.93 1.45 3.38 4.82 4.1l5.07 1.21c6.51 1.44 8.92 4.1 8.92 8.68 0 5.78-5.31 9.88-12.78 9.88-7.96 0-12.78-3.86-13.26-10.13h6.51c.48 3.38 2.89 5.07 6.75 5.07s6.27-1.69 6.27-4.34c0-2.17-1.21-3.38-4.58-4.1l-5.07-1.21c-6.02-1.44-8.91-4.33-8.91-9.16 0-5.54 4.82-9.4 12.29-9.4m17.6-7.95c0-2.17 1.68-3.86 3.85-3.86s3.86 1.69 3.86 3.86-1.69 3.85-3.86 3.85-3.85-1.68-3.85-3.85m.48 8.43h6.51v32.31h-6.51zm33.99 11.09c-.72-3.38-3.13-6.27-7.47-6.27-5.07 0-8.44 4.34-8.44 11.09 0 6.99 3.37 11.09 8.44 11.09 4.09 0 6.5-2.17 7.47-6.03H200c-.73 6.75-6.03 11.57-13.74 11.57-9.16 0-14.95-6.27-14.95-16.63 0-10.13 5.79-16.64 14.95-16.64 8.19 0 13.01 5.31 13.74 11.57zM25.95 8.71c-1.69 1.93-4.34 3.62-6.99 3.38-.48-2.89.96-5.79 2.41-7.48C23.06 2.45 25.95 1 28.36 1c.24 2.65-.72 5.54-2.41 7.71m2.41 3.86c1.45 0 5.78.48 8.68 4.82-.24.24-5.07 3.13-5.07 9.16 0 7.23 6.27 9.64 6.27 9.64 0 .24-.96 3.38-3.13 6.75-1.93 2.9-4.1 5.79-7.23 5.79-3.14 0-4.1-1.93-7.72-1.93-3.61 0-4.82 1.93-7.71 1.93-3.13 0-5.55-3.13-7.47-6.03-4.1-6.02-7.24-16.87-2.9-24.1 1.93-3.62 5.79-6.03 9.65-6.03 3.13 0 6.02 2.17 7.71 2.17s5.06-2.41 8.92-2.17"/></svg>`;
    case "spotify":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 162 50" width="162" height="50" style="fill:currentColor"><path d="M25.54 0c-13.81 0-25 11.19-25 25s11.19 25 25 25 25-11.19 25-25-11.19-25-25-25M37 36.06q-.16.26-.41.44-.25.19-.55.26t-.61.02q-.31-.04-.57-.21c-5.87-3.58-13.26-4.39-21.96-2.41q-.3.07-.61.02-.3-.05-.57-.22-.26-.16-.44-.41-.18-.26-.25-.56t-.02-.61q.06-.3.22-.56.17-.27.42-.45.25-.17.55-.24c9.53-2.18 17.7-1.24 24.29 2.78q.26.17.44.42.19.25.26.55t.02.61q-.05.3-.21.57m3.06-6.81c-.56.92-1.76 1.21-2.68.64-6.72-4.13-16.96-5.32-24.91-2.91q-.37.11-.76.07-.38-.04-.73-.22-.34-.18-.58-.48-.25-.3-.36-.67t-.08-.76q.04-.38.22-.72.19-.34.49-.59t.67-.36c9.08-2.76 20.36-1.42 28.08 3.32.92.57 1.21 1.77.64 2.68m.27-7.09c-8.06-4.78-21.36-5.22-29.05-2.89-1.23.38-2.54-.32-2.91-1.56q-.14-.44-.09-.91.04-.46.26-.87t.58-.7q.36-.3.8-.43c8.84-2.69 23.52-2.17 32.79 3.34q.4.24.68.61t.4.82q.11.45.04.91-.06.46-.3.86a2.33 2.33 0 0 1-3.2.82m28.23.92c-4.32-1.03-5.09-1.75-5.09-3.27 0-1.43 1.35-2.4 3.36-2.4 1.95 0 3.87.73 5.9 2.24q.09.07.21.05.03 0 .06-.01.02-.01.05-.02l.04-.04.04-.04 2.11-2.97q.03-.05.04-.1t.01-.11q-.01-.05-.04-.1-.03-.04-.07-.08c-2.41-1.93-5.12-2.87-8.29-2.87-4.66 0-7.91 2.8-7.91 6.8 0 4.29 2.8 5.81 7.66 6.98 4.13.96 4.83 1.75 4.83 3.18 0 1.58-1.41 2.56-3.68 2.56-2.52 0-4.58-.85-6.88-2.84q-.02-.02-.04-.03-.03-.02-.05-.02l-.06-.02h-.05q-.03 0-.06.01t-.05.02q-.03.01-.05.03l-.04.04-2.36 2.81q-.04.04-.05.1-.02.05-.02.1.01.06.03.11t.07.09c2.67 2.38 5.96 3.64 9.51 3.64 5.02 0 8.27-2.74 8.27-6.99.01-3.58-2.14-5.57-7.4-6.85m18.77-4.25c-2.18 0-3.96.85-5.44 2.61v-1.98a.28.28 0 0 0-.28-.28h-3.86q-.06 0-.11.02t-.09.06-.06.1q-.02.05-.02.1v21.98c0 .15.12.28.28.28h3.86q.06 0 .11-.02t.09-.06.06-.1q.02-.05.02-.1V34.5c1.48 1.65 3.26 2.46 5.44 2.46 4.05 0 8.14-3.11 8.14-9.07.01-5.95-4.09-9.06-8.14-9.06m3.65 9.06c0 3.03-1.87 5.15-4.55 5.15-2.64 0-4.63-2.21-4.63-5.15 0-2.93 1.99-5.14 4.63-5.14 2.63 0 4.55 2.16 4.55 5.14m14.99-9.06c-5.21 0-9.3 4.01-9.3 9.13 0 5.07 4.06 9.03 9.23 9.03 5.23 0 9.32-3.99 9.32-9.1 0-5.08-4.06-9.06-9.25-9.06m0 14.24c-2.78 0-4.86-2.23-4.86-5.18 0-2.96 2.01-5.11 4.79-5.11 2.79 0 4.89 2.22 4.89 5.18s-2.03 5.11-4.82 5.11m20.38-13.89h-4.26v-4.35c0-.16-.12-.28-.28-.28h-3.86q-.06 0-.11.02t-.09.06-.07.09q-.02.05-.02.11v4.35h-1.85q-.06 0-.11.02t-.09.06-.06.09q-.03.06-.03.11v3.32q0 .06.03.11.02.05.06.09t.09.07q.05.02.11.02h1.85v8.59c0 3.48 1.73 5.24 5.14 5.24 1.39 0 2.54-.29 3.62-.9q.03-.02.06-.05.03-.02.05-.06.02-.03.03-.07.01-.03 0-.07v-3.23q-.01-.04-.03-.07l-.04-.06-.06-.04q-.03-.02-.06-.03l-.08-.02q-.03 0-.07.01-.03.01-.06.03c-.75.37-1.47.54-2.27.54-1.24 0-1.8-.56-1.8-1.82v-7.99h4.26q.05 0 .1-.02.06-.02.1-.06.03-.04.06-.1.02-.05.02-.1v-3.33q0-.05-.02-.1-.02-.06-.06-.1t-.09-.06-.11-.02m14.82.02v-.54c0-1.57.6-2.27 1.95-2.27.81 0 1.46.16 2.18.4q.07.03.13.02.07-.02.13-.06.05-.04.08-.1t.03-.13v-3.25q0-.05-.01-.09-.02-.05-.04-.08-.03-.04-.07-.06-.03-.03-.08-.04c-.76-.23-1.74-.47-3.21-.47-3.57 0-5.46 2.01-5.46 5.82v.81h-1.86q-.05 0-.1.03-.06.02-.1.06t-.06.09-.02.11v3.34c0 .15.13.28.28.28h1.86v13.26c0 .15.13.28.29.28h3.86c.16 0 .28-.13.28-.28V23.07h3.61l5.53 13.26c-.63 1.39-1.24 1.66-2.09 1.66q-1.02 0-2.13-.6-.02-.01-.05-.02t-.06-.01q-.03-.01-.06 0-.02 0-.05.01t-.05.02q-.03.02-.05.04l-.04.04q-.02.02-.03.05l-1.31 2.87q-.02.05-.03.11 0 .05.02.1t.05.09q.04.05.08.07c1.37.74 2.6 1.06 4.13 1.06 2.85 0 4.43-1.33 5.82-4.91l6.71-17.33q.01-.03.01-.06.01-.04 0-.07 0-.04-.01-.07t-.03-.06-.05-.05q-.02-.02-.05-.04-.03-.01-.07-.02-.03-.01-.06-.01h-4.03q-.04 0-.09.01-.04.01-.07.04-.04.03-.07.06l-.04.08-4.12 11.77-4.51-11.78q-.02-.04-.05-.07-.02-.04-.06-.06-.03-.03-.07-.04t-.09-.01zm-8.59-.02h-3.87q-.05 0-.11.02-.05.02-.09.06t-.06.1q-.02.05-.02.1v16.87c0 .15.13.28.28.28h3.87c.15 0 .28-.13.28-.28V19.47q0-.06-.02-.11-.02-.06-.06-.1t-.09-.06q-.06-.02-.11-.02m-1.91-7.68c-1.53 0-2.78 1.24-2.78 2.77q0 .55.21 1.06.22.51.61.9t.9.61q.51.21 1.06.21c1.53 0 2.77-1.24 2.77-2.78q0-.55-.21-1.06-.22-.51-.6-.9-.39-.38-.9-.6-.51-.21-1.06-.21"/></svg>`;
    case "youtubemusic":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 50" width="165" height="50" style="fill:currentColor"><path d="M25.41 0C11.38 0 0 11.19 0 25s11.38 25 25.41 25c14.04 0 25.42-11.19 25.42-25 0-13.8-11.38-25-25.42-25m0 41.35a16.35 16.35 0 0 1-15.09-10.1 16.33 16.33 0 0 1 3.55-17.81c4.67-4.67 11.7-6.07 17.81-3.54a16.34 16.34 0 0 1 10.08 15.11c0 2.14-.42 4.27-1.24 6.25s-2.03 3.79-3.54 5.3a16.3 16.3 0 0 1-5.31 3.54c-1.98.83-4.1 1.25-6.25 1.25z"/><path d="M25.52 11.22c-5.58 0-10.61 3.36-12.75 8.51a13.81 13.81 0 0 0 2.99 15.03c3.95 3.94 9.88 5.12 15.03 2.99 5.16-2.14 8.52-7.17 8.52-12.74 0-1.81-.36-3.61-1.05-5.28-.7-1.67-1.71-3.19-2.99-4.48-1.28-1.28-2.8-2.29-4.48-2.98-1.67-.7-3.46-1.05-5.27-1.05M20.21 32.3V17.71L33.54 25zm57.71-12.29c-1.25 6.04-2.09 13.12-2.5 16.24h-.41c-.42-3.12-1.26-10.2-2.51-16.04L69.38 5.63H60V45h5.84V12.5l.62 3.13L72.5 45h5.84l5.83-29.37.42-3.13v32.3h5.83V5.63h-9.58c.21 0-2.92 14.38-2.92 14.38m28.33 18.95q-.21.4-.52.74t-.69.58q-.38.25-.82.39-.43.14-.88.17c-1.25 0-1.88-1.04-1.88-3.55V16.25H94.8V37.5c0 5.21 1.87 7.71 5.83 7.71 2.71 0 4.79-1.25 6.46-3.96h.21l.62 3.55h5.21V16.25h-6.88zm19.59-11.46c-2.09-1.45-3.54-2.5-3.54-4.79q0-2.5 2.49-2.5c1.88 0 2.51 1.25 2.51 5.62l5.62-.2c.42-6.88-1.87-9.79-8.13-9.79-5.62 0-8.53 2.5-8.53 7.5 0 4.58 2.29 6.66 6.04 9.58 3.33 2.5 5.2 3.75 5.2 5.84 0 1.45-1.04 2.49-2.71 2.49-2.08 0-3.12-1.87-2.91-5h-5.62c-.84 6.04 1.66 9.38 8.12 9.38 5.83 0 8.75-2.5 8.75-7.71.41-4.79-2.08-6.67-7.29-10.42m11.25-11.25h6.46V44.8h-6.46zm3.33-11.46c-2.5 0-3.54.83-3.54 3.96 0 3.12 1.25 3.96 3.54 3.96 2.5 0 3.54-.84 3.54-3.96 0-2.92-1.04-3.96-3.54-3.96M165 34.58l-5.83-.21c0 5-.62 6.67-2.5 6.67-1.87 0-2.29-1.88-2.29-7.71V27.7c0-5.83.42-7.49 2.29-7.49 1.88 0 2.29 1.66 2.29 7.08l5.84-.42c.41-4.37-.21-7.5-1.88-9.16-1.25-1.25-3.33-1.88-6.04-1.88-6.46 0-9.17 3.34-9.17 12.92v3.95c0 9.8 2.29 12.93 8.96 12.93 2.71 0 4.79-.63 6.04-1.88 1.67-1.88 2.29-4.79 2.29-9.17"/></svg>`;
    case "deezer":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 50" width="180" height="50" style="fill:currentColor"><path fill-rule="evenodd" d="M101.96 31.92H85.68V12.18h16.28v5.33h-8.6v2.28h8.08v4.36h-8.08v2.43h8.6zm18.12 0H103.8V12.19h16.28v5.33h-8.6v2.28h8.08v4.36h-8.08v2.43h8.6zm50.38 0q-1.24-3.85-3.8-8.17v8.17h-7.7V12.18h10.78c5.23 0 8.55 1.69 8.55 5.28 0 2.36-1.46 3.9-3.9 4.61 2.09 3.61 3.63 6.83 4.75 9.85zM169.32 21c1.14 0 1.78-.62 1.78-1.74 0-1.14-.64-1.74-1.78-1.74h-2.66V21zM157.1 31.92h-16.28V12.18h16.28v5.34h-8.61v2.28h8.09v4.36h-8.09v2.43h8.61zm-35.19-19.74h17.33v5.33c-3.94 3.27-6.74 6.16-8.74 9.07h8.74v5.34h-17.49v-5.34c2.1-3.32 4.81-6.37 8.11-9.07h-7.95zm-57.8 0h9.91c6.14 0 10.47 4.07 10.47 9.87s-4.33 9.87-10.47 9.87h-9.91zm7.7 14.42h1.8c1.93 0 2.95-1.29 2.95-4.55 0-3.25-1.02-4.54-2.95-4.54h-1.8zM42.45 7.63c.47-2.68 1.15-4.36 1.89-4.36h.01c1.4 0 2.54 5.84 2.54 13.07 0 7.21-1.14 13.07-2.55 13.07-.57 0-1.1-1-1.53-2.66-.68 6.09-2.08 10.29-3.71 10.29-1.25 0-2.38-2.52-3.14-6.49-.52 7.54-1.81 12.9-3.34 12.9-.95 0-1.82-2.12-2.46-5.57-.78 7.13-2.57 12.13-4.66 12.13s-3.87-5-4.65-12.13c-.63 3.45-1.51 5.57-2.47 5.57-1.53 0-2.82-5.36-3.34-12.9-.75 3.97-1.88 6.49-3.14 6.49-1.63 0-3.03-4.19-3.7-10.29-.43 1.66-.97 2.66-1.54 2.66-1.41 0-2.55-5.86-2.55-13.07 0-7.23 1.14-13.07 2.55-13.07.76 0 1.42 1.69 1.89 4.36C9.3 3.01 10.52.01 11.9.01c1.63 0 3.05 4.25 3.72 10.42.65-4.49 1.65-7.36 2.76-7.36 1.56 0 2.89 5.63 3.38 13.49.92-4.03 2.26-6.55 3.74-6.55 1.49 0 2.82 2.52 3.75 6.55.49-7.86 1.81-13.49 3.37-13.49 1.12 0 2.11 2.87 2.77 7.36C36.06 4.26 37.47.01 39.11.01c1.37 0 2.6 3 3.34 7.62M1.92 20.89c-.8 0-1.44-2.61-1.44-5.84s.64-5.84 1.44-5.84 1.45 2.61 1.45 5.84-.65 5.84-1.45 5.84m47.16 0c-.8 0-1.45-2.61-1.45-5.84s.65-5.84 1.45-5.84 1.44 2.61 1.44 5.84-.64 5.84-1.44 5.84"/></svg>`;
    case "lastfm":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50" style="fill:currentColor"><path d="m44.71 45.91-2.36-6.41s-3.83 4.27-9.58 4.27c-5.08 0-8.69-4.42-8.69-11.49 0-9.06 4.57-12.3 9.06-12.3 6.48 0 8.55 4.2 10.31 9.58l2.36 7.36c2.36 7.15 6.78 12.89 19.52 12.89 9.13 0 15.32-2.8 15.32-10.16 0-5.97-3.39-9.06-9.72-10.53l-4.72-1.04c-3.24-.73-4.19-2.06-4.19-4.27 0-2.5 1.98-3.98 5.23-3.98 3.53 0 5.45 1.33 5.74 4.5l7.37-.89c-.59-6.63-5.16-9.35-12.67-9.35-6.63 0-13.11 2.5-13.11 10.53 0 5.01 2.43 8.18 8.54 9.65l5.01 1.18c3.76.88 5.01 2.43 5.01 4.57 0 2.72-2.65 3.83-7.66 3.83-7.44 0-10.54-3.91-12.3-9.28l-2.43-7.37c-3.1-9.58-8.03-13.11-17.83-13.11-10.83 0-16.57 6.85-16.57 18.49 0 11.19 5.74 17.23 16.06 17.23 8.32 0 12.3-3.9 12.3-3.9m-31.52-3.46c-.74.22-1.48.37-2.44.37-1.76 0-3.02-.81-3.02-2.95V-.28H0v41.99c0 5.52 3.83 7.81 8.32 7.81 1.48 0 2.88-.22 4.64-.66zm93.18-1.18c-1.92 1.32-3.54 1.99-5.75 1.99-2.8 0-4.35-1.48-4.35-5.09V20.94h10.17V14.9H96.35V6.72l-7.81.96v7.22h-4.93v6.04h4.93v18.85c0 6.78 3.9 10.02 10.24 10.02 3.46 0 6.55-.66 8.99-2.06zm6.71 2.65c0 3.02 2.36 5.45 5.38 5.45 3.17 0 5.53-2.43 5.53-5.45 0-3.09-2.36-5.45-5.53-5.45-3.02 0-5.38 2.36-5.38 5.45m18.91-22.98v27.99h7.74V20.94h8.69V14.9h-8.69v-3.09c0-4.64 1.99-6.12 5.23-6.12 2.28 0 3.83.52 5.59 1.48l1.26-6.49c-2.07-.95-4.5-1.47-7.44-1.47-6.49 0-12.38 3.09-12.38 12.3v3.39h-4.93v6.04zm47.24.66c-.88-5.52-4.49-7.51-9.21-7.51-4.71 0-8.76 2.14-10.53 7.37l-.96-6.56h-6.26v34.03h7.74V29.71c0-6.56 3.39-9.07 6.99-9.07 3.76 0 5.31 2.51 5.31 6.56v21.73h7.66v-19.3c0-6.48 3.46-8.99 7.07-8.99 3.68 0 5.23 2.51 5.23 6.56v21.73H200V24.48c0-7.3-4.27-10.39-9.94-10.39-4.79 0-9.06 2.14-10.83 7.51"/></svg>`;
    default:
      return "";
  }
}

async function prepareAndShowLayoutStep() {
  if (selectedIndices.size === 0) {
    if (originalLines.length > 0) {
      selectedIndices.add(0);
    } else {
      return;
    }
  }

  const bilingualRow = document.getElementById("lyricsBilingualToggleRow");
  if (bilingualRow) {
    bilingualRow.style.display = isTranslated ? "flex" : "none";
  }

  showStep("layout");

  if (currentTrack?.cover) {
    extractedDominant = await extractDominantColor(currentTrack.cover);
  }
  renderLayouts();
}

function renderLayouts() {
  const grid = document.getElementById("lyricsLayoutsGrid");
  if (!grid || !currentTrack) return;

  const sortedLines = Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map((idx) => ({
      orig: originalLines[idx] || "",
      trans: translatedLines ? translatedLines[idx] || originalLines[idx] : null,
    }));

  const textColor = isBlackText ? "#141518" : "#FFFFFF";
  const mutedTextColor = isBlackText ? "rgba(20, 21, 24, 0.72)" : "rgba(255, 255, 255, 0.75)";
  const dividerColor = isBlackText ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.14)";

  const solidCardBg = customColor || clampHexBrightness(extractedDominant.hex, 138);
  const solidStoryBg = customColor ? darkenHex(customColor, 0.35) : extractedDominant.darkerHex;

  const modernStoryBg = customColor ? customColor : extractedDominant.darkerHex;

  const getBlurredCardBg = (isStory) => {
    if (!isStory) return customColor || "#000000";
    if (customColor) {
      const rgb = hexToRgb(customColor);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`;
    }
    return "rgba(0, 0, 0, 0.55)";
  };

  const blurredCardBg = getBlurredCardBg(currentFormat === "story");

  const serviceLogoSvg = getServiceLogoSvg(currentService);

  const renderLinesHtml = () => {
    return sortedLines
      .map((item) => {
        if (isTranslated && isBilingual && item.trans && item.trans !== item.orig) {
          return `
            <div class="lyrics-card-line">
              <span class="lyrics-card-line-orig" style="color: ${mutedTextColor};">${escapeHTML(item.orig)}</span>
              <span class="lyrics-card-line-trans" style="color: ${textColor};">${escapeHTML(item.trans)}</span>
            </div>
          `;
        }
        const text = isTranslated && item.trans ? item.trans : item.orig;
        return `
          <div class="lyrics-card-line" style="color: ${textColor};">${escapeHTML(text)}</div>
        `;
      })
      .join("");
  };

  const layouts = [
    {
      id: "solid",
      name: "Solid",
      cardStyle: `background-color: ${solidCardBg}; color: ${textColor};`,
      frameStyle: currentFormat === "story" ? `background-color: ${solidStoryBg};` : "",
      html: `
        <div class="lyrics-card-target lyrics-card-solid" style="background-color: ${solidCardBg}; color: ${textColor};">
          <div class="lyrics-card-header">
            <img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" alt="Cover" class="lyrics-card-thumb" crossorigin="anonymous" draggable="false" />
            <div class="lyrics-card-meta">
              <span class="lyrics-card-title" style="color: ${textColor};">${escapeHTML(currentTrack.title)}</span>
              <span class="lyrics-card-artist" style="color: ${mutedTextColor};">${escapeHTML(currentTrack.artist)}</span>
            </div>
          </div>
          <div class="lyrics-card-lines lines-count-${sortedLines.length}">
            ${renderLinesHtml()}
          </div>
          ${serviceLogoSvg ? `<div class="lyrics-card-service-logo" style="color: ${textColor}; margin-top: -0.25rem;">${serviceLogoSvg}</div>` : ""}
        </div>
      `,
    },
    {
      id: "modern",
      name: "Modern",
      cardStyle: `background: url("${escapeHTML(currentTrack.cover || "/logo.svg")}") center / cover no-repeat; color: ${textColor};`,
      frameStyle: currentFormat === "story" ? `background-color: ${modernStoryBg};` : "",
      html: `
        <div class="lyrics-card-target lyrics-card-modern" style="background: url('${escapeHTML(currentTrack.cover || "/logo.svg")}') center / cover no-repeat; color: ${textColor};">
          <div class="lyrics-card-modern-overlay"></div>
          <div class="lyrics-card-header" style="position: relative; z-index: 2;">
            <img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" alt="Cover" class="lyrics-card-thumb" crossorigin="anonymous" draggable="false" />
            <div class="lyrics-card-meta">
              <span class="lyrics-card-title" style="color: ${textColor};">${escapeHTML(currentTrack.title)}</span>
              <span class="lyrics-card-artist" style="color: ${mutedTextColor};">${escapeHTML(currentTrack.artist)}</span>
            </div>
          </div>
          <div class="lyrics-card-lines lines-count-${sortedLines.length}" style="position: relative; z-index: 2;">
            ${renderLinesHtml()}
          </div>
          ${serviceLogoSvg ? `<div class="lyrics-card-service-logo" style="position: relative; z-index: 2; color: ${textColor}; margin-top: -0.25rem;">${serviceLogoSvg}</div>` : ""}
        </div>
      `,
    },
    {
      id: "blurred",
      name: "Blurred",
      cardStyle: `background-color: ${blurredCardBg}; color: ${textColor};`,
      frameStyle: "",
      bgHtml: currentFormat === "story" ? `<img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" class="story-blur-image" alt="Blurred BG" crossorigin="anonymous" />` : "",
      html: `
        <div class="lyrics-card-target lyrics-card-blurred" style="background-color: ${blurredCardBg}; color: ${textColor};">
          <div class="lyrics-card-lines lines-count-${sortedLines.length}">
            ${renderLinesHtml()}
          </div>
          <div class="lyrics-card-divider" style="border-top-color: ${dividerColor};">
            <div class="lyrics-card-header" style="align-items: flex-start;">
              <img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" alt="Cover" class="lyrics-card-thumb" style="width: 48px; height: 48px; border-radius: 10px;" crossorigin="anonymous" draggable="false" />
              <div class="lyrics-card-meta">
                <span class="lyrics-card-title" style="color: ${textColor}; font-size: 0.9rem;">${escapeHTML(currentTrack.title)}</span>
                <span class="lyrics-card-artist" style="color: ${mutedTextColor}; font-size: 0.76rem;">${escapeHTML(currentTrack.artist)}</span>
                ${serviceLogoSvg ? `<div class="lyrics-card-service-logo" style="color: ${textColor}; margin-top: 0.35rem;">${serviceLogoSvg}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      `,
    },
  ];

  grid.innerHTML = layouts
    .map(
      (l) => `
      <div class="lyrics-layout-item ${currentLayout === l.id ? "selected" : ""}" data-layout="${l.id}">
        <div class="lyrics-layout-item-header">
          <span class="lyrics-layout-item-title">${l.name}</span>
          <div class="lyrics-layout-item-badge">
            <animate-icons name="check" size="14"></animate-icons>
          </div>
        </div>
        <div class="lyrics-layout-frame format-${currentFormat}" id="frame_${l.id}" style="${l.frameStyle || ""}">
          ${l.bgHtml || ""}
          ${l.html}
        </div>
      </div>
    `
    )
    .join("");

  grid.querySelectorAll(".lyrics-layout-item").forEach((el) => {
    el.addEventListener("click", () => {
      currentLayout = el.dataset.layout;
      grid.querySelectorAll(".lyrics-layout-item").forEach((item) => {
        item.classList.toggle("selected", item.dataset.layout === currentLayout);
      });
      if (typeof umami !== "undefined") {
        umami.track("Lyrics Layout Selected", { layout: currentLayout });
      }
    });
  });
}

function createExportElement(layoutId, format) {
  const sortedLines = Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map((idx) => ({
      orig: originalLines[idx] || "",
      trans: translatedLines ? translatedLines[idx] || originalLines[idx] : null,
    }));

  const textColor = isBlackText ? "#141518" : "#FFFFFF";
  const mutedTextColor = isBlackText ? "rgba(20, 21, 24, 0.72)" : "rgba(255, 255, 255, 0.75)";
  const dividerColor = isBlackText ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.14)";

  const solidCardBg = customColor || clampHexBrightness(extractedDominant.hex, 138);
  const solidStoryBg = customColor ? darkenHex(customColor, 0.35) : extractedDominant.darkerHex;
  const modernStoryBg = customColor ? customColor : extractedDominant.darkerHex;

  const getBlurredCardBg = (isStory) => {
    if (!isStory) return customColor || "#000000";
    if (customColor) {
      const rgb = hexToRgb(customColor);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`;
    }
    return "rgba(0, 0, 0, 0.55)";
  };

  const blurredCardBg = getBlurredCardBg(format === "story");
  const serviceLogoSvg = getServiceLogoSvg(currentService);

  const renderLinesHtml = () => {
    return sortedLines
      .map((item) => {
        if (isTranslated && isBilingual && item.trans && item.trans !== item.orig) {
          return `
            <div class="lyrics-card-line">
              <span class="lyrics-card-line-orig" style="color: ${mutedTextColor};">${escapeHTML(item.orig)}</span>
              <span class="lyrics-card-line-trans" style="color: ${textColor};">${escapeHTML(item.trans)}</span>
            </div>
          `;
        }
        const text = isTranslated && item.trans ? item.trans : item.orig;
        return `
          <div class="lyrics-card-line" style="color: ${textColor};">${escapeHTML(text)}</div>
        `;
      })
      .join("");
  };

  const wrapper = document.createElement("div");
  wrapper.className = `lyrics-export-wrapper export-${format} export-${layoutId}`;

  let innerCardHtml = "";

  if (layoutId === "solid") {
    innerCardHtml = `
      <div class="lyrics-card-target lyrics-card-solid" style="background-color: ${solidCardBg}; color: ${textColor};">
        <div class="lyrics-card-header">
          <img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" alt="Cover" class="lyrics-card-thumb" crossorigin="anonymous" draggable="false" />
          <div class="lyrics-card-meta">
            <span class="lyrics-card-title" style="color: ${textColor};">${escapeHTML(currentTrack.title)}</span>
            <span class="lyrics-card-artist" style="color: ${mutedTextColor};">${escapeHTML(currentTrack.artist)}</span>
          </div>
        </div>
        <div class="lyrics-card-lines lines-count-${sortedLines.length}">
          ${renderLinesHtml()}
        </div>
        ${serviceLogoSvg ? `<div class="lyrics-card-service-logo" style="color: ${textColor}; margin-top: -0.25rem;">${serviceLogoSvg}</div>` : ""}
      </div>
    `;
  } else if (layoutId === "modern") {
    innerCardHtml = `
      <div class="lyrics-card-target lyrics-card-modern" style="background: url('${escapeHTML(currentTrack.cover || "/logo.svg")}') center / cover no-repeat; color: ${textColor};">
        <div class="lyrics-card-modern-overlay"></div>
        <div class="lyrics-card-header" style="position: relative; z-index: 2;">
          <img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" alt="Cover" class="lyrics-card-thumb" crossorigin="anonymous" draggable="false" />
          <div class="lyrics-card-meta">
            <span class="lyrics-card-title" style="color: ${textColor};">${escapeHTML(currentTrack.title)}</span>
            <span class="lyrics-card-artist" style="color: ${mutedTextColor};">${escapeHTML(currentTrack.artist)}</span>
          </div>
        </div>
        <div class="lyrics-card-lines lines-count-${sortedLines.length}" style="position: relative; z-index: 2;">
          ${renderLinesHtml()}
        </div>
        ${serviceLogoSvg ? `<div class="lyrics-card-service-logo" style="position: relative; z-index: 2; color: ${textColor}; margin-top: -0.25rem;">${serviceLogoSvg}</div>` : ""}
      </div>
    `;
  } else {
    innerCardHtml = `
      <div class="lyrics-card-target lyrics-card-blurred" style="background-color: ${blurredCardBg}; color: ${textColor};">
        <div class="lyrics-card-lines lines-count-${sortedLines.length}">
          ${renderLinesHtml()}
        </div>
        <div class="lyrics-card-divider" style="border-top-color: ${dividerColor};">
          <div class="lyrics-card-header" style="align-items: flex-start;">
            <img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" alt="Cover" class="lyrics-card-thumb" style="width: 48px; height: 48px; border-radius: 10px;" crossorigin="anonymous" draggable="false" />
            <div class="lyrics-card-meta">
              <span class="lyrics-card-title" style="color: ${textColor}; font-size: 0.88rem;">${escapeHTML(currentTrack.title)}</span>
              <span class="lyrics-card-artist" style="color: ${mutedTextColor}; font-size: 0.75rem;">${escapeHTML(currentTrack.artist)}</span>
              ${serviceLogoSvg ? `<div class="lyrics-card-service-logo" style="color: ${textColor}; margin-top: 0.35rem;">${serviceLogoSvg}</div>` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (format === "story") {
    let storyBgStyle = "";
    let bgImgHtml = "";
    if (layoutId === "solid") {
      storyBgStyle = `background-color: ${solidStoryBg};`;
    } else if (layoutId === "modern") {
      storyBgStyle = `background-color: ${modernStoryBg};`;
    } else {
      storyBgStyle = `background-color: #0b0c0e;`;
      bgImgHtml = `<img src="${escapeHTML(currentTrack.cover || "/logo.svg")}" class="story-blur-image" alt="Blurred BG" crossorigin="anonymous" />`;
    }

    wrapper.style.cssText = `
      width: 360px;
      height: 640px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3.5rem 1.75rem;
      margin: 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
      box-sizing: border-box;
      ${storyBgStyle}
    `;

    wrapper.innerHTML = `
      ${bgImgHtml}
      ${innerCardHtml}
    `;
  } else {
    wrapper.style.cssText = `
      width: 320px;
      min-width: 320px;
      max-width: 320px;
      position: relative;
      display: flex;
      border: none;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    `;
    wrapper.innerHTML = innerCardHtml;
  }

  return wrapper;
}

async function exportSelectedLyricsImage() {
  if (!currentTrack) return;

  const exportModal = document.getElementById("lyricsExportModal");
  if (exportModal) exportModal.classList.add("show");

  const exportContainer = document.createElement("div");
  exportContainer.style.cssText = `
    position: fixed;
    top: -9999px;
    left: 0;
    width: 1200px;
    height: 1200px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    z-index: -9999;
  `;
  document.body.appendChild(exportContainer);

  try {
    if (currentTrack?.cover) {
      await preloadImage(currentTrack.cover);
    }

    const exportNode = createExportElement(currentLayout, currentFormat);
    exportContainer.appendChild(exportNode);

    const targetElement = currentFormat === "story"
      ? exportNode
      : (exportNode.querySelector(".lyrics-card-target") || exportNode);

    const dataUrl = await htmlToImage.toPng(targetElement, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: null,
    });

    const link = document.createElement("a");
    const cleanTitle = (currentTrack?.title || "lyrics").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `bubblefm_${cleanTitle}_${currentLayout}_${currentFormat}.png`;
    link.href = dataUrl;
    link.click();

    if (typeof umami !== "undefined") {
      umami.track("report_download", {
        tool: "lyrics",
        service: currentService,
        format: currentFormat,
        layout: currentLayout,
        has_custom_color: Boolean(customColor),
        is_translated: isTranslated,
      });
    }
  } catch (err) {
    console.error("Export error:", err);
  } finally {
    if (exportContainer.parentNode) {
      exportContainer.parentNode.removeChild(exportContainer);
    }
    if (exportModal) {
      setTimeout(() => {
        exportModal.classList.remove("show");
      }, 500);
    }
  }
}

async function initResultsPage(gridContainer) {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("search");

  if (!query) {
    window.location.href = "./";
    return;
  }

  const restored = restoreLyricsStateIfAvailable(query);
  if (restored) {
    searchSongs(query).then((results) => {
      if (results && results.length > 0) {
        gridContainer.classList.toggle("is-centered", results.length < 4);
        gridContainer.innerHTML = results
          .map(
            (item) => `
            <div class="lyrics-result-card">
              <div class="lyrics-card-cover-wrapper">
                <img src="${escapeHTML(item.cover || "/logo.svg")}" alt="${escapeHTML(item.title)}" class="lyrics-card-cover" draggable="false" loading="lazy" />
              </div>
              <div class="lyrics-card-info">
                <h3 class="lyrics-card-title">${escapeHTML(item.title)}</h3>
                <p class="lyrics-card-artist"><span class="lyrics-card-artist-name">${escapeHTML(item.artist)}</span></p>
              </div>
              <button class="btn-primary lyrics-card-btn" data-type="song" data-id="${item.id}" data-title="${escapeHTML(item.title)}" data-artist="${escapeHTML(item.artist)}" data-cover="${escapeHTML(item.cover)}" data-cover-hq="${escapeHTML(item.coverHq || "")}">
                Use
              </button>
            </div>
          `
          )
          .join("");

        gridContainer.querySelectorAll(".lyrics-card-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (typeof umami !== "undefined") {
              umami.track("Lyrics Track Selected");
            }
            const item = {
              type: "song",
              id: btn.dataset.id,
              title: btn.dataset.title,
              artist: btn.dataset.artist,
              cover: btn.dataset.coverHq || getHighQualityCover(btn.dataset.cover),
              coverHq: btn.dataset.coverHq || getHighQualityCover(btn.dataset.cover),
            };
            loadTrackLyrics(item);
          });
        });
      }
    });
    return;
  }

  const subtitle = document.getElementById("searchSubtitle");
  if (subtitle) {
    subtitle.innerHTML = `Showing results for "<strong>${escapeHTML(query)}</strong>"`;
  }

  try {
    const results = await searchSongs(query);

    if (!results || results.length === 0) {
      gridContainer.classList.remove("is-centered");
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0;">
          <p style="font-size: 1.1rem; color: var(--color-text-muted);">No songs found for "${escapeHTML(query)}".</p>
        </div>
      `;
      return;
    }

    gridContainer.classList.toggle("is-centered", results.length < 4);

    gridContainer.innerHTML = results
      .map(
        (item) => `
        <div class="lyrics-result-card">
          <div class="lyrics-card-cover-wrapper">
            <img src="${escapeHTML(item.cover || "/logo.svg")}" alt="${escapeHTML(item.title)}" class="lyrics-card-cover" draggable="false" loading="lazy" />
          </div>
          <div class="lyrics-card-info">
            <h3 class="lyrics-card-title">${escapeHTML(item.title)}</h3>
            <p class="lyrics-card-artist"><span class="lyrics-card-artist-name">${escapeHTML(item.artist)}</span></p>
          </div>
          <button class="btn-primary lyrics-card-btn" data-type="song" data-id="${item.id}" data-title="${escapeHTML(item.title)}" data-artist="${escapeHTML(item.artist)}" data-cover="${escapeHTML(item.cover)}" data-cover-hq="${escapeHTML(item.coverHq || "")}">
            Use
          </button>
        </div>
      `
      )
      .join("");

    gridContainer.querySelectorAll(".lyrics-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof umami !== "undefined") {
          umami.track("Lyrics Track Selected");
        }
        const item = {
          type: "song",
          id: btn.dataset.id,
          title: btn.dataset.title,
          artist: btn.dataset.artist,
          cover: btn.dataset.coverHq || getHighQualityCover(btn.dataset.cover),
          coverHq: btn.dataset.coverHq || getHighQualityCover(btn.dataset.cover),
        };
        loadTrackLyrics(item);
      });
    });
  } catch (error) {
    if (typeof umami !== "undefined") {
      umami.track("api_error", {
        tool: "lyrics",
        reason: error.message || "user_not_found",
      });
    }
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0;">
        <p style="font-size: 1.1rem; color: var(--color-error);">Error loading songs. Please try again.</p>
      </div>
    `;
  }
}
