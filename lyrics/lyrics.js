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
  } catch {}

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
  } catch {}

  try {
    const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
    const res = await fetch(ovhUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.lyrics) return data.lyrics;
    }
  } catch {}

  return null;
}

async function translateText(text, targetLang = "pt") {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json) && Array.isArray(json[0])) {
      return json[0].map((item) => item[0]).join("");
    }
  } catch {}
  return null;
}

let currentTrack = null;
let originalLines = [];
let translatedLines = null;
let isTranslated = false;
let selectedIndices = new Set();

function showStep(stepName) {
  const stepResults = document.getElementById("stepResults");
  const stepSelect = document.getElementById("stepSelect");

  if (stepName === "results") {
    if (stepSelect) stepSelect.style.display = "none";
    if (stepResults) {
      stepResults.style.display = "flex";
      stepResults.classList.remove("fade-in");
      void stepResults.offsetWidth;
      stepResults.classList.add("fade-in");
    }
  } else if (stepName === "select") {
    if (stepResults) stepResults.style.display = "none";
    if (stepSelect) {
      stepSelect.style.display = "flex";
      stepSelect.classList.remove("fade-in");
      void stepSelect.offsetWidth;
      stepSelect.classList.add("fade-in");
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
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
    });
  });

  if (countDisplay) {
    countDisplay.textContent = `${selectedIndices.size} / 5`;
  }
}

async function loadTrackLyrics(item) {
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
        window.location.href = `result.html?search=${encodeURIComponent(query)}`;
      }
    });
  }

  const resultsGrid = document.getElementById("lyricsResultsGrid");
  if (resultsGrid) {
    initResultsPage(resultsGrid);
  }

  const translateBtn = document.getElementById("btnTranslateToggle");
  if (translateBtn) {
    translateBtn.addEventListener("click", async () => {
      if (originalLines.length === 0) return;

      if (!translatedLines) {
        translateBtn.disabled = true;
        const textSpan = translateBtn.querySelector("span");
        if (textSpan) textSpan.textContent = "Translating...";
        const fullLyrics = originalLines.join("\n");
        const translatedText = await translateText(fullLyrics, "pt");
        translateBtn.disabled = false;
        if (textSpan) textSpan.textContent = "Translate";

        if (translatedText) {
          const rawSplits = translatedText.split("\n");
          translatedLines = originalLines.map((_, i) => (rawSplits[i] ? rawSplits[i].trim() : originalLines[i]));
        }
      }

      if (translatedLines) {
        isTranslated = !isTranslated;
        translateBtn.classList.toggle("active", isTranslated);
        renderSelectLines();
      }
    });
  }

  const backToResultsBtn = document.getElementById("btnBackToResults");
  if (backToResultsBtn) {
    backToResultsBtn.addEventListener("click", () => {
      showStep("results");
    });
  }

  const continueBtn = document.getElementById("btnContinue");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      const sortedSelected = Array.from(selectedIndices)
        .sort((a, b) => a - b)
        .map((idx) => ({
          original: originalLines[idx],
          translated: translatedLines ? translatedLines[idx] || originalLines[idx] : null,
        }));

      sessionStorage.setItem(
        "selectedLyricsPayload",
        JSON.stringify({
          title: currentTrack?.title || "",
          artist: currentTrack?.artist || "",
          cover: currentTrack?.cover || "",
          isTranslated,
          lines: sortedSelected,
        })
      );
    });
  }
});

async function initResultsPage(gridContainer) {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("search");

  if (!query) {
    window.location.href = "./";
    return;
  }

  const subtitle = document.getElementById("searchSubtitle");
  if (subtitle) {
    subtitle.innerHTML = `Showing results for "<strong>${escapeHTML(query)}</strong>"`;
  }

  try {
    const results = await searchSongs(query);

    if (!results || results.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0;">
          <p style="font-size: 1.1rem; color: var(--color-text-muted);">No songs found for "${escapeHTML(query)}".</p>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = results
      .map(
        (item) => `
        <div class="lyrics-result-card">
          <div class="lyrics-card-cover-wrapper">
            <img src="${escapeHTML(item.cover || "/logo.svg")}" alt="${escapeHTML(item.title)}" class="lyrics-card-cover" draggable="false" loading="lazy" />
          </div>
          <div class="lyrics-card-info">
            <h3 class="lyrics-card-title">${escapeHTML(item.title)}</h3>
            <p class="lyrics-card-artist">by <span class="lyrics-card-artist-name">${escapeHTML(item.artist)}</span></p>
          </div>
          <button class="btn-primary lyrics-card-btn" data-type="song" data-id="${item.id}" data-title="${escapeHTML(item.title)}" data-artist="${escapeHTML(item.artist)}" data-cover="${escapeHTML(item.cover)}">
            Use
          </button>
        </div>
      `
      )
      .join("");

    gridContainer.querySelectorAll(".lyrics-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = {
          type: "song",
          id: btn.dataset.id,
          title: btn.dataset.title,
          artist: btn.dataset.artist,
          cover: btn.dataset.cover,
        };
        loadTrackLyrics(item);
      });
    });
  } catch (error) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0;">
        <p style="font-size: 1.1rem; color: var(--color-error);">Error loading songs. Please try again.</p>
      </div>
    `;
  }
}
