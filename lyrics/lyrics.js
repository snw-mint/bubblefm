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
        sessionStorage.setItem("selectedLyricsItem", JSON.stringify(item));
        const event = new CustomEvent("lyricsItemSelected", { detail: item });
        window.dispatchEvent(event);
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
