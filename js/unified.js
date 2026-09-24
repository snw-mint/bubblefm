/*
 * BubbleFM
 * Copyright (c) 2026 SnowMint
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M451.5-771.5Q440-783 440-800v-80q0-17 11.5-28.5T480-920t28.5 11.5T520-880v80q0 17-11.5 28.5T480-760t-28.5-11.5M678-678q-11-11-11-27.5t11-28.5l56-57q12-12 28.5-12t28.5 12q11 11 11 28t-11 28l-57 57q-11 11-28 11t-28-11m122 238q-17 0-28.5-11.5T760-480t11.5-28.5T800-520h80q17 0 28.5 11.5T920-480t-11.5 28.5T880-440zM451.5-51.5Q440-63 440-80v-80q0-17 11.5-28.5T480-200t28.5 11.5T520-160v80q0 17-11.5 28.5T480-40t-28.5-11.5M226-678l-57-56q-12-12-12-29t12-28q11-11 28-11t28 11l57 57q11 11 11 28t-11 28q-12 11-28 11t-28-11m508 509-56-57q-11-12-11-28.5t11-27.5 27.5-11 28.5 11l57 56q12 11 11.5 28T791-169q-12 12-29 12t-28-12M80-440q-17 0-28.5-11.5T40-480t11.5-28.5T80-520h80q17 0 28.5 11.5T200-480t-11.5 28.5T160-440zm89 271q-11-11-11-28t11-28l57-57q11-11 27.5-11t28.5 11q12 12 12 28.5T282-225l-56 56q-12 12-29 12t-28-12m141-141q-70-70-70-170t70-170 170-70 170 70 70 170-70 170-170 70-170-70m283-57q47-47 47-113t-47-113-113-47-113 47-47 113 47 113 113 47 113-47M480-480"/></svg>`;
const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColo"><path d="M484-80q-84 0-157.5-32t-128-86.5-86.5-128T80-484q0-128 72-232t193-146q22-8 41 5.5t18 36.5q-3 85 27 162t90 137 137 90 162 27q26-1 38.5 17.5T863-345q-44 120-147.5 192.5T484-80m0-80q88 0 163-44t118-121q-86-8-163-43.5T464-465t-97-138-43-163q-77 43-120.5 118.5T160-484q0 135 94.5 229.5T484-160m-20-305"/></svg>`;

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

  initFaqModal();

  const pb = document.getElementById("promoBanner");
  if (pb) {
    const ua = navigator.userAgent || "";
    const pl = navigator.userAgentData?.platform || navigator.platform || "";
    const isWin = /Win/i.test(pl) || /Windows/i.test(ua);
    const isMob = Boolean(navigator.userAgentData?.mobile) || /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
    if (isWin && !isMob) {
      pb.style.display = "flex";
      pb.addEventListener("click", () => {
        if (typeof umami !== "undefined") {
          umami.track("Fluent Scrobbler Outbound Click");
        }
      });
    }
  }

  const formUsername = document.getElementById("form-username");
  if (formUsername) {
    formUsername.addEventListener("submit", (e) => {
      e.preventDefault();
      const userInput = document.getElementById("userInput").value.trim();
      if (userInput) {
        sessionStorage.setItem("lastfm_user", userInput);
        if (typeof umami !== "undefined") {
          umami.track("Search Initiated", { type: "single" });
        }
        window.location.href = "result.html";
      }
    });
  }

  const formMatch = document.getElementById("form-match");
  if (formMatch) {
    formMatch.addEventListener("submit", (e) => {
      e.preventDefault();
      const userInput1 = document.getElementById("userInput1").value.trim();
      const userInput2 = document.getElementById("userInput2").value.trim();
      if (userInput1 && userInput2) {
        sessionStorage.setItem("lastfm_user1", userInput1);
        sessionStorage.setItem("lastfm_user2", userInput2);
        if (typeof umami !== "undefined") {
          umami.track("Search Initiated", { type: "match" });
        }
        window.location.href = "result.html";
      }
    });
  }

  if (window.location.pathname.endsWith("result.html") || window.location.pathname.includes("result.html")) {
    const user = sessionStorage.getItem("lastfm_user");
    if (!user) {
      window.location.href = "index.html";
    } else {
      let currentPeriod = "month";
      let periodOffset = 0;
      updatePeriodNavigation(currentPeriod, periodOffset);

      const toggleBtns = document.querySelectorAll(".time-toggle-btn");
      if (toggleBtns.length > 0) {
        toggleBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            if (btn.classList.contains("active")) return;

            toggleBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            currentPeriod = btn.getAttribute("data-period");
            periodOffset = 0;
            updatePeriodNavigation(currentPeriod, periodOffset);
            resetToSkeletons();
            fetchLastfmAndDeezerData(user, currentPeriod, periodOffset);
          });
        });
      }

      const prevPeriodBtn = document.getElementById("prevPeriodBtn");
      const nextPeriodBtn = document.getElementById("nextPeriodBtn");
      let isNavigating = false;

      const handlePeriodChange = async (newOffset) => {
        if (isNavigating) return;
        isNavigating = true;

        if (prevPeriodBtn) prevPeriodBtn.disabled = true;
        if (nextPeriodBtn) nextPeriodBtn.disabled = true;

        periodOffset = newOffset;
        updatePeriodNavigation(currentPeriod, periodOffset);
        resetToSkeletons();

        try {
          await fetchLastfmAndDeezerData(user, currentPeriod, periodOffset);
        } finally {
          isNavigating = false;
          updatePeriodNavigation(currentPeriod, periodOffset);
        }
      };

      if (prevPeriodBtn) {
        prevPeriodBtn.addEventListener("click", () => {
          handlePeriodChange(periodOffset - 1);
        });
      }

      if (nextPeriodBtn) {
        nextPeriodBtn.addEventListener("click", () => {
          if (periodOffset >= 0) return;
          handlePeriodChange(periodOffset + 1);
        });
      }

      fetchLastfmAndDeezerData(user, currentPeriod, periodOffset);
    }
  }
});

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const periodCache = {};
let currentActiveData = null;

function getLocalStorageCache(key) {
  try {
    const raw = localStorage.getItem("bubblefm_cache_" + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return parsed.data;
    } else {
      localStorage.removeItem("bubblefm_cache_" + key);
    }
  } catch (e) {}
  return null;
}

function setLocalStorageCache(key, data) {
  try {
    localStorage.setItem(
      "bubblefm_cache_" + key,
      JSON.stringify({
        timestamp: Date.now(),
        data: data,
      })
    );
  } catch (e) {}
}

function updatePeriodNavigation(period, offset) {
  const periodDisplayText = document.getElementById("periodDisplayText");
  const prevPeriodBtn = document.getElementById("prevPeriodBtn");
  const nextPeriodBtn = document.getElementById("nextPeriodBtn");

  if (nextPeriodBtn) {
    nextPeriodBtn.disabled = offset >= 0;
  }
  if (prevPeriodBtn) {
    prevPeriodBtn.disabled = false;
  }

  if (!periodDisplayText) return;

  const now = new Date();
  if (period === "month") {
    const targetMonthStart = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    periodDisplayText.textContent = targetMonthStart.toLocaleString("en-US", { month: "long" });
  } else if (period === "week") {
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const targetMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + offset * 7);
    let targetEnd;
    if (offset === 0) {
      targetEnd = new Date(now);
    } else {
      targetEnd = new Date(targetMonday.getFullYear(), targetMonday.getMonth(), targetMonday.getDate() + 6);
    }

    const startDay = targetMonday.getDate().toString().padStart(2, "0");
    const endDay = targetEnd.getDate().toString().padStart(2, "0");
    periodDisplayText.textContent = `${startDay}-${endDay}`;
  }
}

function isPlaceholderImage(url) {
  if (!url) return true;
  return url.includes("d41d8cd98f00b204e9800998ecf8427e");
}

function selectBestArtist(items, targetName) {
  if (!items || items.length === 0) return null;
  const targetLower = (targetName || "").toLowerCase().trim();

  const validMatches = items.filter(
    (item) =>
      item.name &&
      item.name.toLowerCase().trim() === targetLower &&
      !isPlaceholderImage(item.picture_medium || item.picture),
  );

  if (validMatches.length > 0) {
    validMatches.sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));
    return validMatches[0];
  }

  const anyValid = items.filter((item) => !isPlaceholderImage(item.picture_medium || item.picture));
  if (anyValid.length > 0) {
    anyValid.sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));
    return anyValid[0];
  }

  return items[0];
}

function fetchDeezerJsonp(type, query) {
  return new Promise((resolve) => {
    const callbackName = "deezer_cb_" + Math.random().toString(36).substring(2);
    const script = document.createElement("script");

    const timer = setTimeout(() => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(null);
    }, 5000);

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

async function fetchAssetData(type, query) {
  const cleanQuery = (query || "").replace(/["']/g, "").trim();
  if (!cleanQuery) return null;
  try {
    const jsonpData = await fetchDeezerJsonp(type, cleanQuery);
    if (jsonpData && jsonpData.data && jsonpData.data.length > 0) return jsonpData;
  } catch (e) {
    console.warn("Deezer JSONP fetch warning:", e);
  }
  return null;
}

const IGNORED_TAGS = new Set([
  "seen live",
  "favorites",
  "favorite",
  "spotify",
  "albums i own",
  "female vocalists",
  "male vocalists",
  "american",
  "british",
  "canadian",
  "english",
  "swedish",
  "japanese",
  "german",
  "french",
  "australian",
  "under 2000 listeners",
  "scrobble",
  "all",
  "loved",
  "my favorites",
  "favorite artists",
  "check out",
  "tracks i own"
]);

function formatVibeTag(tag) {
  if (!tag) return "";
  const lower = tag.toLowerCase().trim();
  if (lower === "r&b" || lower === "rnb") return "R&B";
  if (lower === "edm") return "EDM";
  if (lower === "k-pop" || lower === "kpop") return "K-Pop";
  if (lower === "j-pop" || lower === "jpop") return "J-Pop";
  if (lower === "idm") return "IDM";
  return lower
    .split(/([\s\-])/)
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
}

async function fetchTopVibeTag(artists, lastfmBaseUrl) {
  if (!artists || artists.length === 0) return null;
  const topArtists = artists.slice(0, 5);
  const tagScores = {};

  const promises = topArtists.map(async (artist) => {
    try {
      const res = await fetch(
        `${lastfmBaseUrl}?method=artist.gettoptags&artist=${encodeURIComponent(artist.name)}&_t=${Date.now()}`
      );
      if (!res.ok) return;
      const json = await res.json();
      let rawTags = json.toptags?.tag || [];
      if (!Array.isArray(rawTags)) rawTags = [rawTags];

      rawTags.slice(0, 8).forEach((t) => {
        const tagName = (t.name || "").toLowerCase().trim();
        if (!tagName || IGNORED_TAGS.has(tagName)) return;
        const count = parseInt(t.count || 0, 10) || 1;
        const weight = count * (artist.playcount || 1);
        tagScores[tagName] = (tagScores[tagName] || 0) + weight;
      });
    } catch (e) {}
  });

  await Promise.all(promises);

  const sortedTags = Object.keys(tagScores).sort((a, b) => tagScores[b] - tagScores[a]);
  if (sortedTags.length > 0) {
    return formatVibeTag(sortedTags[0]);
  }
  return null;
}

function initFaqModal() {
  const faqToggle = document.getElementById("faq-toggle");
  if (!faqToggle) return;

  const isMatchMode = window.location.pathname.includes("match");

  let faqModal = document.getElementById("faqModal");
  if (!faqModal) {
    faqModal = document.createElement("div");
    faqModal.id = "faqModal";
    faqModal.className = "modal";
    faqModal.setAttribute("aria-hidden", "true");

    const singleFaqHtml = `
      <div class="modal-content faq-modal-content">
        <span class="close-button" id="faqCloseBtn">&times;</span>
        <div class="faq-header">
          <h2>Frequently Asked Questions</h2>
          <p class="modal-info">Quick answers about BubbleFM features, calculations, and feedback.</p>
        </div>
        <div class="faq-list">
          <details class="faq-item" open>
            <summary class="faq-question">How are monthly and weekly charts calculated?</summary>
            <div class="faq-answer">
              <p><strong>Monthly charts</strong> count scrobbles starting from the 1st day of the current month. <strong>Weekly charts</strong> count from Monday of the current week. Once these timeframes end, counts automatically reset for the next period.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">How can I view detailed stats for individual items?</summary>
            <div class="faq-answer">
              <p>Hover over (or tap on mobile) any artist, album, or song in your chart to view its total scrobble count and estimated listening time in minutes.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">How do I generate and download a shareable story card?</summary>
            <div class="faq-answer">
              <p>Click the green floating button at the bottom right labeled <strong>Generate card</strong>. Follow the quick step-by-step setup to pick your layout, colors, and format, then download your image.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">How do I switch my card's Light / Dark theme?</summary>
            <div class="faq-answer">
              <p>The generated card automatically matches the website's active theme. Click the <strong>Sun / Moon icon</strong> in the top header to toggle between light and dark mode before generating your card.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">Are my personal data or Last.fm credentials saved?</summary>
            <div class="faq-answer">
              <p>No login or account creation is required! All stats and images are fetched live on your device using public APIs (Last.fm, Deezer, MusicBrainz). Your data is never saved on servers.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">Feedback, Suggestions & Bug Reports</summary>
            <div class="faq-answer">
              <p>BubbleFM is open-source! We welcome community contributions and feedback on GitHub:</p>
              <ul class="faq-links-list">
                <li><strong>Design Feedback:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=feedback.yml" target="_blank" rel="noopener noreferrer">Propose a design or UI improvement</a></li>
                <li><strong>Feature Ideas:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=feature.yml" target="_blank" rel="noopener noreferrer">Suggest a new feature</a></li>
                <li><strong>Bug Reports:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=bug.yml" target="_blank" rel="noopener noreferrer">Report an issue or bug</a></li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    `;

    const matchFaqHtml = `
      <div class="modal-content faq-modal-content">
        <span class="close-button" id="faqCloseBtn">&times;</span>
        <div class="faq-header">
          <h2>Match FAQ</h2>
          <p class="modal-info">Quick answers about BubbleFM Match calculations, compatibility score, and charts.</p>
        </div>
        <div class="faq-list">
          <details class="faq-item" open>
            <summary class="faq-question">What timeframe is calculated for Match?</summary>
            <div class="faq-answer">
              <p>Match compatibility and top charts are calculated based on listening history from the <strong>last 30 days</strong> for both Last.fm users.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">How is the compatibility percentage calculated?</summary>
            <div class="faq-answer">
              <p>Compatibility compares the top 100 artists of both users over the last 30 days. It measures shared artists relative to the maximum possible overlap:</p>
              <p style="margin-top: 0.4rem; background: var(--color-neutral-100); padding: 0.5rem; border-radius: 6px; font-family: monospace; font-size: 0.82rem;">(Shared Artists ÷ Minimum Total Artists) × 100</p>
              <p style="margin-top: 0.4rem;">For example, if both users have 100 top artists and share 45 of them, your match score is <strong>45%</strong>.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">What is the difference between User Vibe and Common Artists?</summary>
            <div class="faq-answer">
              <p><strong>User Vibe:</strong> Displays top individual artists listened to by each user over the last 30 days.</p>
              <p><strong>Common Artists:</strong> Ranks top artists listened to by both users, combining their shared scrobble counts.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">How do I switch the Match card's Light / Dark theme?</summary>
            <div class="faq-answer">
              <p>The generated card automatically matches the website's active theme. Click the <strong>Sun / Moon icon</strong> in the top header to toggle between light and dark mode before generating your card.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">Are my personal data or Last.fm credentials saved?</summary>
            <div class="faq-answer">
              <p>No login or account creation is required! All stats and images are fetched live on your device using public APIs (Last.fm, Deezer, MusicBrainz). Your data is never saved on servers.</p>
            </div>
          </details>

          <details class="faq-item">
            <summary class="faq-question">Feedback, Suggestions & Bug Reports</summary>
            <div class="faq-answer">
              <p>BubbleFM is open-source! We welcome community contributions and feedback on GitHub:</p>
              <ul class="faq-links-list">
                <li><strong>Design Feedback:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=feedback.yml" target="_blank" rel="noopener noreferrer">Propose a design or UI improvement</a></li>
                <li><strong>Feature Ideas:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=feature.yml" target="_blank" rel="noopener noreferrer">Suggest a new feature</a></li>
                <li><strong>Bug Reports:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=bug.yml" target="_blank" rel="noopener noreferrer">Report an issue or bug</a></li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    `;

    faqModal.innerHTML = isMatchMode ? matchFaqHtml : singleFaqHtml;
    document.body.appendChild(faqModal);
  }

  const faqCloseBtn = document.getElementById("faqCloseBtn");

  const openFaq = () => {
    faqModal.classList.add("show");
    faqModal.setAttribute("aria-hidden", "false");

    try {
      if (typeof umami !== "undefined") {
        umami.track("FAQ Opened");
      }
      const count = parseInt(localStorage.getItem("bubblefm_faq_open_count") || "0", 10) + 1;
      localStorage.setItem("bubblefm_faq_open_count", count.toString());
      console.log(`[Analytics] FAQ Opened. Total local opens: ${count}`);
    } catch (e) {}
  };

  const closeFaq = () => {
    faqModal.classList.remove("show");
    faqModal.setAttribute("aria-hidden", "true");
  };

  faqToggle.addEventListener("click", openFaq);
  if (faqCloseBtn) faqCloseBtn.addEventListener("click", closeFaq);
  faqModal.addEventListener("click", (e) => {
    if (e.target === faqModal) closeFaq();
  });
}

function initGlobalTooltip() {
  let globalTooltip = document.getElementById("globalTooltip");
  if (!globalTooltip) {
    globalTooltip = document.createElement("div");
    globalTooltip.id = "globalTooltip";
    globalTooltip.className = "global-tooltip";
    document.body.appendChild(globalTooltip);
  }

  document.addEventListener("mouseover", (e) => {
    const chartItem = e.target.closest(".chart-item");
    if (chartItem && !chartItem.closest("#storyCardContainer")) {
      const plays = chartItem.getAttribute("data-plays");
      const minutes = chartItem.getAttribute("data-minutes");
      if (plays && minutes) {
        globalTooltip.textContent = `${plays} streams / ${minutes} min`;
        globalTooltip.classList.add("show");

        const rect = chartItem.getBoundingClientRect();

        let top = rect.top + window.scrollY - 40;
        let left = rect.left + window.scrollX + rect.width / 2;

        globalTooltip.style.top = `${top}px`;
        globalTooltip.style.left = `${left}px`;
      }
    } else {
      globalTooltip.classList.remove("show");
    }
  });
}
initGlobalTooltip();

function resetToSkeletons() {
  const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
  if (btnGerarRelatorio) {
    btnGerarRelatorio.classList.add("hidden");
  }

  const textFields = ["userScrobbles", "userMinutes", "userDailyAvg", "userVibe"];
  textFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.classList.add("skeleton", "skeleton-text");
      el.style.width = "80px";
    }
  });

  const chartContainers = ["listTopArtists", "listTopTracks", "listTopAlbums"];
  chartContainers.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div class="chart-item top-1">
            <div class="top1-image skeleton skeleton-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-300q75 0 127.5-52.5T660-480q0-75-52.5-127.5T480-660q-75 0-127.5 52.5T300-480q0 75 52.5 127.5T480-300Zm-28.5-151.5Q440-463 440-480t11.5-28.5Q463-520 480-520t28.5 11.5Q520-497 520-480t-11.5 28.5Q497-440 480-440t-28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
            </div>
            <div class="text-content">
                <span class="skeleton skeleton-text" style="width: 120px; height: 18px;"></span>
                <span class="skeleton skeleton-text" style="width: 80px; height: 14px; margin-top: 4px;"></span>
            </div>
        </div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#2</span> <span class="skeleton skeleton-text" style="width: 150px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#3</span> <span class="skeleton skeleton-text" style="width: 130px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#4</span> <span class="skeleton skeleton-text" style="width: 160px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#5</span> <span class="skeleton skeleton-text" style="width: 140px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#6</span> <span class="skeleton skeleton-text" style="width: 170px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#7</span> <span class="skeleton skeleton-text" style="width: 120px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#8</span> <span class="skeleton skeleton-text" style="width: 145px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#9</span> <span class="skeleton skeleton-text" style="width: 155px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500);">#10</span> <span class="skeleton skeleton-text" style="width: 135px; height: 16px;"></span></div>
      `;
    }
  });
}

async function fetchLastfmAndDeezerData(username, period = "month", offset = 0) {
  const cacheKey = `${username}_${period}_${offset}`;

  if (periodCache[cacheKey]) {
    currentActiveData = periodCache[cacheKey];
    renderData(username, currentActiveData);
    return;
  }

  const stored = getLocalStorageCache(cacheKey);
  if (stored) {
    periodCache[cacheKey] = stored;
    currentActiveData = stored;
    renderData(username, stored);
    return;
  }

  try {
    const lastfmBaseUrl = "https://bubblefm.snw-mint.workers.dev/data";

    let from, to;
    const now = new Date();
    let subtitleText = "";
    let reviewLabel = "Month Review";

    if (period === "month") {
      const targetMonthStart = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0);
      from = Math.floor(targetMonthStart.getTime() / 1000);
      if (offset === 0) {
        to = Math.floor(now.getTime() / 1000);
      } else {
        const targetMonthEnd = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
        to = Math.floor(targetMonthEnd.getTime() / 1000);
      }
      subtitleText = targetMonthStart.toLocaleString("en-US", { month: "long" }).toUpperCase();
      reviewLabel = "Month Review";
    } else if (period === "week") {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      currentMonday.setHours(0, 0, 0, 0);

      const targetMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + offset * 7, 0, 0, 0);
      from = Math.floor(targetMonday.getTime() / 1000);

      let targetEnd;
      if (offset === 0) {
        targetEnd = new Date(now);
        to = Math.floor(now.getTime() / 1000);
      } else {
        targetEnd = new Date(targetMonday.getFullYear(), targetMonday.getMonth(), targetMonday.getDate() + 6, 23, 59, 59);
        to = Math.floor(targetEnd.getTime() / 1000);
      }

      const startDay = targetMonday.getDate().toString().padStart(2, "0");
      const endDay = targetEnd.getDate().toString().padStart(2, "0");
      const monthShort = targetEnd.toLocaleString("en-US", { month: "short" }).toLowerCase();
      subtitleText = `${startDay}-${endDay} ${monthShort}`;
      reviewLabel = "Week Review";
    }

    const [userInfoRes, firstPageRes] = await Promise.all([
      fetch(`${lastfmBaseUrl}?method=user.getinfo&user=${username}&_t=${Date.now()}`),
      fetch(
        `${lastfmBaseUrl}?method=user.getrecenttracks&user=${username}&limit=200&from=${from}&to=${to}&_t=${Date.now()}`,
      ),
    ]);

    const userInfo = await userInfoRes.json();
    const firstPageData = await firstPageRes.json();

    let rawTracks = firstPageData.recenttracks?.track || [];
    if (!Array.isArray(rawTracks)) rawTracks = [rawTracks];

    const totalPages = parseInt(firstPageData.recenttracks?.["@attr"]?.totalPages || 0, 10);

    if (totalPages > 1) {
      const promises = [];
      for (let i = 2; i <= totalPages; i++) {
        promises.push(
          fetch(
            `${lastfmBaseUrl}?method=user.getrecenttracks&user=${username}&limit=200&page=${i}&from=${from}&to=${to}&_t=${Date.now()}`,
          ).then((r) => r.json()),
        );
      }
      const pagesData = await Promise.all(promises);
      pagesData.forEach((page) => {
        let pageTracks = page.recenttracks?.track || [];
        if (!Array.isArray(pageTracks)) pageTracks = [pageTracks];
        rawTracks = rawTracks.concat(pageTracks);
      });
    }

    const artistMap = {};
    const albumMap = {};
    const trackMap = {};

    rawTracks.forEach((track) => {
      const artistName = track.artist?.["#text"] || track.artist?.name;
      const albumName = track.album?.["#text"];
      const trackName = track.name;

      if (!artistName) return;

      if (!artistMap[artistName]) artistMap[artistName] = { name: artistName, playcount: 0 };
      artistMap[artistName].playcount++;

      if (albumName) {
        const albumKey = `${artistName} - ${albumName}`;
        if (!albumMap[albumKey]) albumMap[albumKey] = { name: albumName, artist: { name: artistName }, playcount: 0 };
        albumMap[albumKey].playcount++;
      }

      if (trackName) {
        const trackKey = `${artistName} - ${trackName}`;
        if (!trackMap[trackKey]) trackMap[trackKey] = { name: trackName, artist: { name: artistName }, playcount: 0 };
        trackMap[trackKey].playcount++;
      }
    });

    const artists = Object.values(artistMap).sort((a, b) => b.playcount - a.playcount);
    const albums = Object.values(albumMap).sort((a, b) => b.playcount - a.playcount);
    const tracks = Object.values(trackMap).sort((a, b) => b.playcount - a.playcount);

    const topArtistName = artists[0]?.name;
    const topAlbumName = albums[0]?.name;
    const topAlbumArtist = albums[0]?.artist?.name;
    const topTrackName = tracks[0]?.name;
    const topTrackArtist = tracks[0]?.artist?.name;

    let artistImage = null;
    let artistCoverImage = null;
    let albumImage = null;
    let trackImage = null;
    let vibeTag = null;

    const assetPromises = [];

    if (artists && artists.length > 0) {
      assetPromises.push(
        fetchTopVibeTag(artists, lastfmBaseUrl)
          .then((v) => {
            vibeTag = v;
          })
          .catch(() => {}),
      );
    }

    if (topArtistName) {
      assetPromises.push(
        fetchAssetData("artist", topArtistName)
          .then((data) => {
            if (data && data.data && data.data.length > 0) {
              const bestArtist = selectBestArtist(data.data, topArtistName);
              if (bestArtist) {
                artistImage = bestArtist.picture_xl || bestArtist.picture;
                artistCoverImage = bestArtist.picture_xl || bestArtist.picture_big || bestArtist.picture;
              }
            }
          })
          .catch((err) => console.warn("Artist asset fetch warning:", err)),
      );
    }

    if (topAlbumName) {
      const albumQuery = `${topAlbumName} ${topAlbumArtist || ""}`;
      assetPromises.push(
        fetchAssetData("album", albumQuery)
          .then((data) => {
            if (data && data.data && data.data.length > 0) {
              albumImage = data.data[0].cover_xl || data.data[0].cover;
            }
          })
          .catch((err) => console.warn("Album asset fetch warning:", err)),
      );
    }

    if (topTrackName) {
      const trackQuery = `${topTrackName} ${topTrackArtist || ""}`;
      assetPromises.push(
        fetchAssetData("track", trackQuery)
          .then((data) => {
            if (data && data.data && data.data.length > 0) {
              const item = data.data[0];
              trackImage = item.album ? item.album.cover_xl || item.album.cover : item.cover_xl || item.cover;
            }
          })
          .catch((err) => console.warn("Track asset fetch warning:", err)),
      );
    }

    await Promise.all(assetPromises);

    const data = {
      artists,
      albums,
      tracks,
      artistImage,
      artistCoverImage,
      albumImage,
      trackImage,
      userInfo,
      rawTracks,
      from,
      to,
      period,
      offset,
      subtitleText,
      reviewLabel,
      vibeTag,
    };

    periodCache[cacheKey] = data;
    setLocalStorageCache(cacheKey, data);
    currentActiveData = data;
    renderData(username, data);
  } catch (error) {
    console.error("Error fetching API data:", error);
  }
}

function renderData(username, data) {
  const {
    artists,
    albums,
    tracks,
    artistImage,
    artistCoverImage,
    albumImage,
    trackImage,
    userInfo,
    rawTracks,
    from,
    to,
    vibeTag,
  } = data;

  function renderList(listId, items, type) {
    const container = document.getElementById(listId);
    if (!container || !items || items.length === 0) return;

    let html = "";
    items.slice(0, 10).forEach((item, index) => {
      const rank = index + 1;
      const name = escapeHTML(item.name);
      const playcountNum = parseInt(item.playcount || 0, 10);
      const playcountStr = playcountNum.toLocaleString("en-US");
      const minutesStr = Math.round(playcountNum * 3.5).toLocaleString("en-US");

      if (rank === 1) {
        let subText = "";
        if (type === "artist") {
          subText = `${playcountStr} plays`;
        } else if (type === "track" || type === "album") {
          subText = `${escapeHTML(item.artist.name)} - ${playcountStr} plays`;
        }

        html += `
                    <div class="chart-item top-1" data-plays="${playcountStr}" data-minutes="${minutesStr}" style="cursor: pointer;">
                        <div class="top1-image skeleton skeleton-icon" id="${type}1Skeleton">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-300q75 0 127.5-52.5T660-480q0-75-52.5-127.5T480-660q-75 0-127.5 52.5T300-480q0 75 52.5 127.5T480-300Zm-28.5-151.5Q440-463 440-480t11.5-28.5Q463-520 480-520t28.5 11.5Q520-497 520-480t-11.5 28.5Q497-440 480-440t-28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                        </div>
                        <img class="top1-image" id="${type}1Img" alt="Top ${type}" style="display: none;" />
                        <div class="text-content">
                            <span title="${name}">${name}</span>
                            <span style="font-size: 0.9rem; opacity: 0.8;" title="${subText}">${subText}</span>
                        </div>
                    </div>
                `;
      } else {
        let text = "";
        if (type === "artist") {
          text = name;
        } else if (type === "track" || type === "album") {
          text = `${name} - ${escapeHTML(item.artist.name)}`;
        }
        html += `
                    <div class="chart-item" data-plays="${playcountStr}" data-minutes="${minutesStr}" style="cursor: pointer;">
                        <span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500); flex-shrink: 0;">#${rank}</span>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0;" title="${text}">${text}</span>
                    </div>
                `;
      }
    });
    container.innerHTML = html;
  }

  renderList("listTopArtists", artists, "artist");
  renderList("listTopTracks", tracks, "track");
  renderList("listTopAlbums", albums, "album");

  function updateTop1Image(type, imageUrl) {
    const imgEl = document.getElementById(`${type}1Img`);
    const skeletonEl = document.getElementById(`${type}1Skeleton`);
    if (imgEl && skeletonEl && imageUrl) {
      imgEl.src = imageUrl;
      imgEl.onload = () => {
        imgEl.classList.add("fade-in");
        imgEl.style.display = "block";
        skeletonEl.style.display = "none";
      };
    }
  }

  updateTop1Image("artist", artistImage);
  updateTop1Image("album", albumImage);
  updateTop1Image("track", trackImage);

  const userAvatarEl = document.getElementById("userAvatar");
  const userAvatarContainer = document.getElementById("userAvatarContainer");
  const userDisplayNameEl = document.getElementById("userDisplayName");

  const artistCoverEl = document.getElementById("artistCover");
  const coverContainer = document.getElementById("coverContainer");

  if (userDisplayNameEl) {
    userDisplayNameEl.textContent = userInfo?.user?.realname || userInfo?.user?.name || username;
    userDisplayNameEl.classList.remove("skeleton", "skeleton-text");
    userDisplayNameEl.style.width = "auto";
  }

  if (userAvatarEl && userAvatarContainer) {
    const images = userInfo?.user?.image;
    const avatarUrl = Array.isArray(images)
      ? images.find((img) => img.size === "extralarge")?.["#text"] ||
        images.find((img) => img.size === "large")?.["#text"] ||
        images[images.length - 1]?.["#text"]
      : null;
    if (avatarUrl && avatarUrl.trim() !== "") {
      userAvatarEl.src = avatarUrl;
      userAvatarEl.onload = () => {
        userAvatarEl.classList.add("fade-in");
        userAvatarEl.style.display = "block";
        document.getElementById("userAvatarSkeletonIcon").style.display = "none";
        userAvatarContainer.classList.remove("skeleton", "skeleton-icon");
      };
    }
  }

  if (artistCoverEl && coverContainer && artistCoverImage) {
    artistCoverEl.src = artistCoverImage;
    artistCoverEl.onload = () => {
      artistCoverEl.classList.add("fade-in");
      artistCoverEl.style.display = "block";
      document.getElementById("coverSkeletonIcon").style.display = "none";
      coverContainer.classList.remove("skeleton", "skeleton-icon");
    };
  }

  const userScrobblesEl = document.getElementById("userScrobbles");
  const userMinutesEl = document.getElementById("userMinutes");
  const userDailyAvgEl = document.getElementById("userDailyAvg");

  function removeSkeletonText(el) {
    if (el) {
      el.classList.remove("skeleton", "skeleton-text");
      el.style.width = "auto";
    }
  }

  if (userScrobblesEl) {
    const playcount = rawTracks.length;
    userScrobblesEl.textContent = playcount.toLocaleString("en-US");
    removeSkeletonText(userScrobblesEl);

    if (userMinutesEl) {
      const estimatedMinutes = Math.round(playcount * 3.5);
      userMinutesEl.textContent = estimatedMinutes.toLocaleString("en-US");
      removeSkeletonText(userMinutesEl);
    }

    if (userDailyAvgEl) {
      const periodStartMs = from * 1000;
      const currentMs = to * 1000;
      let daysElapsed = Math.max(1, Math.ceil((currentMs - periodStartMs) / (1000 * 60 * 60 * 24)));
      const dailyAvg = Math.round(playcount / daysElapsed);
      userDailyAvgEl.textContent = dailyAvg.toLocaleString("en-US");
      removeSkeletonText(userDailyAvgEl);
    }

    const userVibeEl = document.getElementById("userVibe");
    if (userVibeEl) {
      userVibeEl.textContent = vibeTag || "-";
      removeSkeletonText(userVibeEl);
    }
  }

  const chartsTimeTextEl = document.getElementById("chartsTimeText");
  if (chartsTimeTextEl) {
    const activePeriodBtn = document.querySelector(".time-toggle-btn.active");
    const currentP = activePeriodBtn ? activePeriodBtn.dataset.period : "month";
    if (currentP === "week") {
      chartsTimeTextEl.textContent = "Showing charts since last Monday";
    } else {
      const d = new Date();
      const mStr = d.toLocaleString("en-US", { month: "long" });
    }
  }

  const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
  if (btnGerarRelatorio) {
    btnGerarRelatorio.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
  const settingsModal = document.getElementById("generationSettingsModal");
  const closeSettings = document.getElementById("closeSettingsModal");
  const confirmSettings = document.getElementById("confirmSettingsBtn");

  const bgOptions = document.querySelectorAll(".bg-option");
  bgOptions.forEach(option => {
    option.addEventListener("click", () => {
      bgOptions.forEach(opt => opt.classList.remove("selected"));
      option.classList.add("selected");
    });
  });



  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const nextStepBtn = document.getElementById("nextStepBtn");
  const backStepBtn = document.getElementById("backStepBtn");

  if (nextStepBtn) {
    nextStepBtn.addEventListener("click", () => {
      if(step1 && step2) {
        step1.style.display = "none";
        step2.style.display = "block";
      }
    });
  }

  if (backStepBtn) {
    backStepBtn.addEventListener("click", () => {
      if(step1 && step2) {
        step2.style.display = "none";
        step1.style.display = "block";
      }
    });
  }

  if (btnGerarRelatorio && settingsModal) {
    btnGerarRelatorio.addEventListener("click", () => {
      if(step1 && step2) {
        step1.style.display = "block";
        step2.style.display = "none";
      }
      settingsModal.classList.add("show");
    });

    if (closeSettings) {
      closeSettings.addEventListener("click", () => {
        settingsModal.classList.remove("show");
      });
    }

    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove("show");
      }
    });
  }

  const storyCardContainer = document.getElementById("storyCardContainer");
  const cardElement = document.getElementById("storyCard");
  const themeToggleCheckbox = document.getElementById("themeToggleCheckbox");

  if (themeToggleCheckbox && cardElement) {
    const updateCardTheme = () => {
      cardElement.className = themeToggleCheckbox.checked ? "theme-light" : "theme-dark";
    };
    themeToggleCheckbox.addEventListener("change", updateCardTheme);
    updateCardTheme();
  }

  if (confirmSettings && storyCardContainer) {
    confirmSettings.addEventListener("click", async () => {
      if (!currentActiveData) {
        alert("Data not fully loaded yet. Please wait.");
        return;
      }

      settingsModal.classList.remove("show");
      const data = currentActiveData;

      const serviceSelectElem = document.getElementById("serviceSelect");
      const serviceSelect = serviceSelectElem ? serviceSelectElem.value : "none";

      const selectedBgOption = document.querySelector(".bg-option.selected");
      const selectedBg = selectedBgOption ? selectedBgOption.dataset.bg : "candy";
      const isLight = document.getElementById("themeToggleCheckbox").checked;

      const cardElement = document.getElementById("storyCard");
      if (cardElement) {
        cardElement.className = isLight ? "theme-light" : "theme-dark";
      }

      const cardBgImg = document.getElementById("storyCardBackgroundImg");
      if (cardBgImg) {
        cardBgImg.src = `/assets/bg/${selectedBg}.webp`;
      }

      document.getElementById("storyCardTitle").textContent = "Recap";

      const logoContainer = document.getElementById("storyServiceLogo");
      logoContainer.innerHTML = "";
      if (serviceSelect === "applemusic") {
        logoContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" xml:space="preserve" viewBox="0 0 84.3 20.7"><path d="M35.4 20.1V6.6h-.1l-5.4 13.5h-2.1L22.4 6.6h-.1v13.5h-2.5V1.8H23l5.8 14.6h.1l5.8-14.6H38v18.3zm16.7 0h-2.6v-2.3h-.1c-.7 1.6-2.1 2.5-4.1 2.5-2.9 0-4.6-1.9-4.6-5V6.7h2.7v8.1c0 2 1 3.1 2.8 3.1 2 0 3.1-1.4 3.1-3.5V6.7H52zm7.4-13.6c3.1 0 5 1.7 5.1 4.2h-2.5c-.2-1.3-1.1-2.1-2.6-2.1s-2.5.7-2.5 1.8c0 .8.6 1.4 2 1.7l2.1.5c2.7.6 3.7 1.7 3.7 3.6 0 2.4-2.2 4.1-5.3 4.1-3.3 0-5.3-1.6-5.5-4.2h2.7c.2 1.4 1.2 2.1 2.8 2.1s2.6-.7 2.6-1.8c0-.9-.5-1.4-1.9-1.7l-2.1-.5c-2.5-.6-3.7-1.8-3.7-3.8 0-2.3 2-3.9 5.1-3.9m7.3-3.3c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6-.7 1.6-1.6 1.6-1.6-.7-1.6-1.6m.2 3.5h2.7v13.4H67zm14.1 4.6c-.3-1.4-1.3-2.6-3.1-2.6-2.1 0-3.5 1.8-3.5 4.6 0 2.9 1.4 4.6 3.5 4.6 1.7 0 2.7-.9 3.1-2.5h2.6c-.3 2.8-2.5 4.8-5.7 4.8-3.8 0-6.2-2.6-6.2-6.9 0-4.2 2.4-6.9 6.2-6.9 3.4 0 5.4 2.2 5.7 4.8zM11.5 3.6c-.7.8-1.8 1.5-2.9 1.4-.2-1.2.4-2.4 1-3.1.7-.9 1.9-1.5 2.9-1.5.1 1.1-.3 2.3-1 3.2m1 1.6c.6 0 2.4.2 3.6 2C16 7.3 14 8.5 14 11c0 3 2.6 4 2.6 4 0 .1-.4 1.4-1.3 2.8-.8 1.2-1.7 2.4-3 2.4s-1.7-.8-3.2-.8-2 .8-3.2.8c-1.3 0-2.3-1.3-3.1-2.5-1.7-2.5-3-7-1.2-10 .8-1.5 2.4-2.5 4-2.5 1.3 0 2.5.9 3.2.9s2.1-1 3.7-.9"/></svg>`;
      } else if (serviceSelect === "spotify") {
        logoContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 160"><path fill="currentColor" d="M79.655 0C35.664 0 0 35.663 0 79.654c0 43.993 35.664 79.653 79.655 79.653 43.996 0 79.656-35.66 79.656-79.653 0-43.988-35.66-79.65-79.657-79.65zm36.53 114.884a4.963 4.963 0 0 1-6.83 1.646c-18.702-11.424-42.246-14.011-69.973-7.676a4.967 4.967 0 0 1-5.944-3.738 4.96 4.96 0 0 1 3.734-5.945c30.343-6.933 56.37-3.948 77.367 8.884a4.965 4.965 0 0 1 1.645 6.83m9.75-21.689c-1.799 2.922-5.622 3.845-8.543 2.047-21.41-13.16-54.049-16.972-79.374-9.284a6.22 6.22 0 0 1-7.75-4.138 6.22 6.22 0 0 1 4.141-7.745c28.929-8.778 64.892-4.526 89.48 10.583 2.92 1.798 3.843 5.622 2.045 8.538m.836-22.585C101.1 55.362 58.742 53.96 34.231 61.4c-3.936 1.194-8.098-1.028-9.29-4.964a7.453 7.453 0 0 1 4.965-9.294c28.137-8.542 74.912-6.892 104.469 10.655a7.44 7.44 0 0 1 2.606 10.209c-2.092 3.54-6.677 4.707-10.206 2.605zm89.944 2.922c-13.754-3.28-16.198-5.581-16.198-10.418 0-4.57 4.299-7.645 10.7-7.645 6.202 0 12.347 2.336 18.796 7.143.19.145.437.203.675.165a.9.9 0 0 0 .6-.367l6.715-9.466a.903.903 0 0 0-.171-1.225c-7.676-6.157-16.313-9.15-26.415-9.15-14.848 0-25.225 8.911-25.225 21.662 0 13.673 8.95 18.515 24.417 22.252 13.155 3.031 15.38 5.57 15.38 10.11 0 5.032-4.49 8.161-11.718 8.161-8.028 0-14.582-2.71-21.906-9.046a.93.93 0 0 0-.656-.218.9.9 0 0 0-.619.313l-7.533 8.96a.906.906 0 0 0 .086 1.256c8.522 7.61 19.004 11.624 30.323 11.624 16 0 26.339-8.742 26.339-22.277.028-11.421-6.81-17.746-23.561-21.821zm59.792-13.564c-6.934 0-12.622 2.732-17.321 8.33V62c0-.498-.4-.903-.894-.903h-12.318a.9.9 0 0 0-.894.902v70.009c0 .494.4.903.894.903h12.318a.9.9 0 0 0 .894-.903v-22.097c4.699 5.26 10.387 7.838 17.32 7.838 12.89 0 25.94-9.92 25.94-28.886.019-18.97-13.032-28.894-25.93-28.894zm11.614 28.893c0 9.653-5.945 16.397-14.468 16.397-8.418 0-14.772-7.048-14.772-16.397 0-9.35 6.354-16.397 14.772-16.397 8.38 0 14.468 6.893 14.468 16.396m47.759-28.893c-16.598 0-29.601 12.78-29.601 29.1 0 16.143 12.917 28.784 29.401 28.784 16.655 0 29.696-12.736 29.696-28.991 0-16.2-12.955-28.89-29.496-28.89zm0 45.385c-8.827 0-15.485-7.096-15.485-16.497 0-9.444 6.43-16.298 15.285-16.298 8.884 0 15.58 7.093 15.58 16.504 0 9.443-6.468 16.291-15.38 16.291m64.937-44.258h-13.554V47.24c0-.497-.4-.902-.894-.902H374.05a.906.906 0 0 0-.904.902v13.855h-5.916a.9.9 0 0 0-.894.902v10.584a.9.9 0 0 0 .894.903h5.916v27.39c0 11.062 5.508 16.674 16.38 16.674 4.413 0 8.075-.914 11.528-2.873a.88.88 0 0 0 .457-.78v-10.083a.9.9 0 0 0-.428-.76.87.87 0 0 0-.876-.039c-2.368 1.19-4.66 1.741-7.229 1.741-3.947 0-5.716-1.798-5.716-5.812V73.49h13.554a.9.9 0 0 0 .894-.903V62.003a.873.873 0 0 0-.884-.903zm47.217.054v-1.702c0-5.006 1.921-7.238 6.22-7.238 2.57 0 4.633.51 6.945 1.28a.895.895 0 0 0 1.18-.858l-.001-10.377a.89.89 0 0 0-.637-.865c-2.435-.726-5.555-1.47-10.235-1.47-11.367 0-17.388 6.405-17.388 18.516v2.606H428.2a.906.906 0 0 0-.904.902v10.638c0 .497.41.903.904.903h5.916v42.237c0 .504.41.904.904.904h12.308c.504 0 .904-.4.904-.904V73.487h11.5l17.616 42.234c-1.998 4.433-3.967 5.317-6.65 5.317-2.168 0-4.46-.646-6.79-1.93a.98.98 0 0 0-.714-.067.9.9 0 0 0-.533.485l-4.175 9.16a.9.9 0 0 0 .39 1.17c4.356 2.359 8.284 3.367 13.145 3.367 9.093 0 14.125-4.242 18.548-15.637l21.364-55.204a.88.88 0 0 0-.095-.838.88.88 0 0 0-.733-.392h-12.822a.9.9 0 0 0-.856.605l-13.136 37.509-14.382-37.534a.9.9 0 0 0-.837-.58h-21.04zm-27.375-.054h-12.318a.907.907 0 0 0-.903.902v53.724c0 .504.409.904.903.904h12.318c.495 0 .904-.4.904-.904v-53.72a.9.9 0 0 0-.904-.903zm-6.088-24.464c-4.88 0-8.836 3.95-8.836 8.828a8.835 8.835 0 0 0 8.836 8.836c4.88 0 8.827-3.954 8.827-8.836a8.83 8.83 0 0 0-8.827-8.828"/></svg>`;
      } else if (serviceSelect === "youtubemusic") {
        logoContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.264 0.264 914.755 277.094"><path fill="currentColor" fill-rule="evenodd" d="M281.514 138.811q0 57.388-41.188 97.967t-99.437 40.58q-58.248 0-99.437-40.58Q.265 196.199.264 138.811c-.001-57.388 13.73-70.914 41.188-97.967Q82.642.264 140.89.264c58.248 0 71.978 13.527 99.437 40.58s41.188 59.708 41.188 97.967z M112.764 179.74l73.049-40.917l-73.049-40.941zm319.685-68.153c-6.685 32.939-11.765 73.152-14.432 89.755h-1.882c-2.159-17.11-7.239-57.058-14.166-89.478l-17.122-80.692H332.66v217.633h32.362V69.388l3.198 16.752 32.905 162.63H433.5l32.362-162.63 3.463-16.845v179.499H501.7V31.16h-52.682zM589.203 216.12c-2.956 5.969-9.352 10.114-15.794 10.114-7.482 0-10.438-5.704-10.438-19.697V89.79H526.05v118.803c0 29.326 9.883 42.788 31.842 42.788 14.963 0 26.994-6.489 35.307-22.04h.808l3.198 19.442h28.887V89.8h-36.923v126.308h.035zm108.32-63.57C685.481 143.983 678 138.28 678 125.834c0-8.81 4.272-13.74 14.432-13.74 10.448 0 13.924 6.986 14.166 30.873l31.046-1.281c2.401-38.632-10.714-54.726-44.681-54.726-31.554 0-47.083 13.74-47.083 42.003 0 25.677 12.85 37.35 33.713 52.67 17.93 13.497 28.367 21.013 28.367 31.912 0 8.313-5.357 14.005-14.72 14.005-10.968 0-17.4-10.125-15.76-27.767l-31.288.508c-4.838 32.928 8.844 52.128 45.2 52.128 31.843 0 48.434-14.27 48.434-42.788-.034-25.942-13.393-36.333-42.303-57.08zm97.907-62.76h-35.318v158.98h35.33V89.8zm-17.4-62.785c-13.623 0-20.066 4.93-20.066 22.063 0 17.642 6.396 22.04 20.078 22.04 13.912 0 20.066-4.421 20.066-22.04 0-16.325-6.154-22.063-20.078-22.063M914.187 191.46l-32.362-1.559c0 28.01-3.198 37.084-14.155 37.084-10.968 0-12.85-10.125-12.85-43.065v-30.826c0-31.924 2.159-42.014 13.127-42.014 10.16 0 12.839 9.582 12.839 39.174l32.073-2.056c2.16-24.638-1.073-41.506-10.956-51.089-7.24-7.02-18.196-10.356-33.436-10.356-35.838 0-50.558 18.68-50.558 71.051v22.306c0 53.953 12.561 71.329 49.23 71.329 15.517 0 26.208-3.117 33.436-9.86 10.414-9.398 14.42-25.458 13.624-50.12z" /><path fill="none" stroke="var(--sc-bg)" stroke-width="18.42" d="M225.264 138.811q0 34.433-24.713 58.78-24.712 24.348-59.662 24.348c-34.95 0-43.187-8.116-59.662-24.348q-24.713-24.347-24.713-58.78c0-34.433 8.238-42.549 24.713-58.78q24.713-24.348 59.662-24.348 34.95 0 59.662 24.348 24.713 24.347 24.713 58.78z" /></svg>`;
      } else if (serviceSelect === "deezer") {
        logoContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1559 436"><path fill-rule="evenodd" d="M885.4 278.4H743.5V106.3h141.9v46.5h-75v19.9h70.5v38h-70.5v21.2h75zm158 0H901.5V106.3h141.9v46.5h-75v19.9h70.5v38h-70.5v21.2h75zm439.3 0c-7.2-22.4-18.2-46.1-33.1-71.2v71.2h-67.1V106.3h94c45.6 0 74.5 14.7 74.5 46 0 20.6-12.7 34-34 40.2 18.2 31.5 31.7 59.6 41.4 85.9zm-9.9-95.2c9.9 0 15.5-5.4 15.5-15.2 0-9.9-5.6-15.2-15.5-15.2h-23.2v30.4zm-106.6 95.2h-141.9V106.3h141.9v46.5h-75v19.9h70.5v38h-70.5v21.2h75zm-306.8-172.1h151.1v46.5c-34.4 28.5-58.8 53.7-76.2 79.1h76.2v46.5H1058v-46.5c18.3-29 41.9-55.6 70.7-79.1h-69.3zm-504 0h86.4c53.5 0 91.3 35.5 91.3 86 0 50.6-37.8 86.1-91.3 86.1h-86.4zM622.5 232h15.7c16.8 0 25.7-11.2 25.7-39.6s-8.9-39.6-25.7-39.6h-15.7zm-256-165.4c4.1-23.4 10-38.1 16.5-38.1h.1c12.2 0 22.1 51 22.1 114 0 62.9-9.9 114-22.2 114-5 0-9.6-8.7-13.4-23.2-5.9 53.1-18.1 89.7-32.3 89.7-10.9 0-20.8-22-27.4-56.6-4.5 65.8-15.8 112.5-29.1 112.5-8.3 0-15.9-18.5-21.5-48.6-6.8 62.2-22.4 105.8-40.6 105.8s-33.8-43.6-40.6-105.8c-5.5 30.1-13.1 48.6-21.5 48.6-13.3 0-24.6-46.7-29.1-112.5-6.6 34.6-16.4 56.6-27.4 56.6-14.2 0-26.4-36.5-32.3-89.7-3.7 14.5-8.4 23.2-13.4 23.2-12.3 0-22.2-51.1-22.2-114 0-63 9.9-114 22.2-114 6.6 0 12.4 14.8 16.5 38.1C77.4 26.3 88.1.1 100.1.1c14.2 0 26.6 37.1 32.4 90.9 5.7-39.2 14.4-64.2 24.1-64.2 13.6 0 25.2 49.1 29.5 117.6 8-35.1 19.7-57.1 32.6-57.1 13 0 24.6 22 32.7 57.1 4.3-68.5 15.8-117.6 29.4-117.6 9.7 0 18.4 25 24.1 64.2C310.8 37.2 323.1.1 337.4.1c11.9 0 22.6 26.2 29.1 66.5M13.1 182.2c-7 0-12.6-22.7-12.6-50.9s5.6-51 12.6-51c6.9 0 12.6 22.8 12.6 51s-5.7 50.9-12.6 50.9m411.2 0c-6.9 0-12.6-22.7-12.6-50.9s5.7-51 12.6-51c7 0 12.6 22.8 12.6 51s-5.6 50.9-12.6 50.9" style="fill:currentColor"/></svg>`;
      } else if (serviceSelect === "lastfm") {
        logoContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 708.767 179.332"><path fill="currentColor" d="m158.431 165.498-8.354-22.708s-13.575 15.14-33.932 15.14c-18.013 0-30.802-15.662-30.802-40.721 0-32.106 16.182-43.591 32.107-43.591 22.969 0 30.277 14.878 36.543 33.934l8.354 26.103c8.351 25.318 24.013 45.678 69.17 45.678 32.37 0 54.295-9.918 54.295-36.02 0-21.143-12.009-32.107-34.458-37.328l-16.705-3.654c-11.484-2.61-14.877-7.309-14.877-15.14 0-8.875 7.046-14.096 18.533-14.096 12.529 0 19.315 4.699 20.36 15.923l26.102-3.133c-2.088-23.492-18.271-33.15-44.896-33.15-23.491 0-46.462 8.875-46.462 37.327 0 17.75 8.614 28.975 30.277 34.195l17.752 4.175c13.312 3.133 17.748 8.614 17.748 16.185 0 9.656-9.396 13.572-27.146 13.572-26.364 0-37.325-13.834-43.591-32.89l-8.614-26.101c-10.961-33.934-28.452-46.463-63.169-46.463-38.37 0-58.731 24.275-58.731 65.517 0 39.677 20.361 61.08 56.906 61.08 29.492 0 43.59-13.834 43.59-13.834M46.726 153.229c-2.61.784-5.221 1.306-8.614 1.306-6.265 0-10.703-2.87-10.703-10.442V1.827H0v148.792c0 19.577 13.575 27.672 29.497 27.672 5.221 0 10.181-.785 16.446-2.349zm330.185-4.176c-6.787 4.701-12.529 7.051-20.36 7.051-9.92 0-15.401-5.221-15.401-18.012V77.006h36.023V55.603H341.41V26.625l-27.669 3.394v25.583h-17.49v21.403h17.49v66.826c0 24.02 13.834 35.5 36.284 35.5 12.269 0 23.232-2.346 31.847-7.305zm23.807 9.396c0 10.705 8.354 19.318 19.056 19.318 11.226 0 19.578-8.613 19.578-19.318 0-10.963-8.353-19.313-19.578-19.313-10.702 0-19.056 8.35-19.056 19.313m67.009-81.443v99.195h27.409V77.006h30.803V55.603h-30.803V44.638c0-16.444 7.049-21.665 18.534-21.665 8.092 0 13.574 1.825 19.839 5.221l4.437-22.974C530.638 1.827 522.023 0 511.582 0c-22.973 0-43.855 10.963-43.855 43.593v12.01h-17.489v21.403zm167.427 2.352c-3.133-19.578-15.923-26.629-32.63-26.629-16.706 0-31.062 7.571-37.329 26.104l-3.393-23.23h-22.188v120.598h27.409v-68.129c0-23.235 12.008-32.11 24.799-32.11 13.312 0 18.795 8.875 18.795 23.232V176.2h27.147v-68.39c0-22.974 12.269-31.849 25.061-31.849 13.052 0 18.532 8.875 18.532 23.232v77.006h27.409v-86.66c0-25.843-15.14-36.81-35.24-36.81-16.965 0-32.107 7.571-38.372 26.629"/></svg>`;
      }

      const monthYearEl = document.getElementById("storyMonthYear");
      if (monthYearEl) {
        const d = new Date(data.from * 1000);
        const mStr = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
        if (data.period === "week") {
          monthYearEl.textContent = `${mStr} WEEK`;
        } else {
          monthYearEl.textContent = `${mStr} ${d.getFullYear()}`;
        }
      }

      const minutes = Math.round(data.rawTracks.length * 3.5);
      const minutesEl = document.getElementById("storyTotalMinutes");
      if (minutesEl) {
        minutesEl.textContent = `${minutes.toLocaleString("en-US")} minutes`;
      }

      const fetchAssetImage = async (type, query, targetName = "") => {
        try {
          const json = await fetchAssetData(type, query);
          if (json && json.data && json.data.length > 0) {
            if (type === "artist") {
              const bestArtist = selectBestArtist(json.data, targetName || query);
              return bestArtist ? bestArtist.picture_xl || bestArtist.picture : null;
            } else if (type === "track" && json.data[0].album) {
              return json.data[0].album.cover_xl || json.data[0].album.cover;
            } else {
              return json.data[0].cover_xl || json.data[0].cover;
            }
          }
        } catch (e) {
          console.warn("fetchAssetImage warning:", e);
        }
        return null;
      };

      const truncateWithEllipsis = (str, maxLength = 22) => {
        if (!str) return "";
        const s = String(str).trim();
        if (s.length <= maxLength) return s;
        return s.slice(0, maxLength).trimEnd() + "...";
      };

      const populateList = (containerId, items) => {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
        const top3 = items.slice(0, 3);
        top3.forEach((item, index) => {
          const rank = index + 1;
          const rawSubText = item.artist ? item.artist.name : `${item.playcount} streams`;
          const displayName = truncateWithEllipsis(item.name, 22);
          const displaySub = truncateWithEllipsis(rawSubText, 28);
          container.innerHTML += `
            <div class="story-item-row">
              <span class="story-item-rank">${rank}</span>
              <div class="story-item-details">
                <span class="story-item-name" title="${escapeHTML(item.name)}">${escapeHTML(displayName)}</span>
                <span class="story-item-sub" title="${escapeHTML(rawSubText)}">${escapeHTML(displaySub)}</span>
              </div>
            </div>
          `;
        });
      };

      populateList("storyListArtists", data.artists);
      populateList("storyListSongs", data.tracks);
      populateList("storyListAlbums", data.albums);

      const topArtist = data.artists[0];
      const topSong = data.tracks[0];
      const topAlbum = data.albums[0];

      if (topArtist) {
        const src = (await fetchAssetImage("artist", topArtist.name, topArtist.name)) || "https://via.placeholder.com/320";
        document.getElementById("storyImageArtist").src = src;
      }
      if (topSong) {
        const query = `${topSong.name} ${topSong.artist?.name || ""}`.trim();
        const src = (await fetchAssetImage("track", query, topSong.name)) || "https://via.placeholder.com/320";
        document.getElementById("storyImageSong").src = src;
      }
      if (topAlbum) {
        const query = `${topAlbum.name} ${topAlbum.artist?.name || ""}`.trim();
        const src = (await fetchAssetImage("album", query, topAlbum.name)) || "https://via.placeholder.com/320";
        document.getElementById("storyImageAlbum").src = src;
      }

      storyCardContainer.style.opacity = "0";
      storyCardContainer.style.zIndex = "-999";
      confirmSettings.textContent = "Generating...";

      const generationModal = document.getElementById("generationModal");
      const stateLoading = document.getElementById("generationStateLoading");
      const stateComplete = document.getElementById("generationStateComplete");

      if (generationModal) {
        stateLoading.style.display = "flex";
        stateComplete.style.display = "none";
        generationModal.classList.add("show");
      }

      setTimeout(() => {
        html2canvas(cardElement, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          backgroundColor: null,
        })
          .then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `bubblefm_report_${new Date().getTime()}.png`;
            link.href = imgData;
            link.click();

            if (typeof umami !== "undefined") {
              umami.track("Card Generated", {
                type: "single",
                service: serviceSelect,
                theme: isLight ? "light" : "dark"
              });
            }

            confirmSettings.textContent = "Generate";

            if (generationModal) {
              stateLoading.style.display = "none";
              stateComplete.style.display = "flex";
              setTimeout(() => {
                generationModal.classList.remove("show");
              }, 2500);
            }
          })
          .catch((err) => {
            console.error("Error generating canvas", err);
            confirmSettings.textContent = "Error";
            if (generationModal) {
              generationModal.classList.remove("show");
            }
          });
      }, 1000);
    });
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
});
