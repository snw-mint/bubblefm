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
        logoContainer.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50"><path d="M83.57 48.49V15.95h-.24L70.31 48.49h-5.06L52.23 15.95h-.24v32.54h-6.03V4.37h7.72l13.98 35.2h.24l13.98-35.2h7.96v44.12zm40.25 0h-6.27v-5.55h-.24c-1.68 3.86-5.06 6.03-9.88 6.03-6.99 0-11.09-4.58-11.09-12.05V16.19h6.51v19.52c0 4.82 2.41 7.48 6.75 7.48 4.82 0 7.47-3.38 7.47-8.44V16.19h6.51zm17.84-32.79c7.47 0 12.05 4.1 12.29 10.13h-6.02c-.48-3.14-2.65-5.07-6.27-5.07s-6.03 1.69-6.03 4.34c0 1.93 1.45 3.38 4.82 4.1l5.07 1.21c6.51 1.44 8.92 4.1 8.92 8.68 0 5.78-5.31 9.88-12.78 9.88-7.96 0-12.78-3.86-13.26-10.13h6.51c.48 3.38 2.89 5.07 6.75 5.07s6.27-1.69 6.27-4.34c0-2.17-1.21-3.38-4.58-4.1l-5.07-1.21c-6.02-1.44-8.91-4.33-8.91-9.16 0-5.54 4.82-9.4 12.29-9.4m17.6-7.95c0-2.17 1.68-3.86 3.85-3.86s3.86 1.69 3.86 3.86-1.69 3.85-3.86 3.85-3.85-1.68-3.85-3.85m.48 8.43h6.51v32.31h-6.51zm33.99 11.09c-.72-3.38-3.13-6.27-7.47-6.27-5.07 0-8.44 4.34-8.44 11.09 0 6.99 3.37 11.09 8.44 11.09 4.09 0 6.5-2.17 7.47-6.03H200c-.73 6.75-6.03 11.57-13.74 11.57-9.16 0-14.95-6.27-14.95-16.63 0-10.13 5.79-16.64 14.95-16.64 8.19 0 13.01 5.31 13.74 11.57zM25.95 8.71c-1.69 1.93-4.34 3.62-6.99 3.38-.48-2.89.96-5.79 2.41-7.48C23.06 2.45 25.95 1 28.36 1c.24 2.65-.72 5.54-2.41 7.71m2.41 3.86c1.45 0 5.78.48 8.68 4.82-.24.24-5.07 3.13-5.07 9.16 0 7.23 6.27 9.64 6.27 9.64 0 .24-.96 3.38-3.13 6.75-1.93 2.9-4.1 5.79-7.23 5.79-3.14 0-4.1-1.93-7.72-1.93-3.61 0-4.82 1.93-7.71 1.93-3.13 0-5.55-3.13-7.47-6.03-4.1-6.02-7.24-16.87-2.9-24.1 1.93-3.62 5.79-6.03 9.65-6.03 3.13 0 6.02 2.17 7.71 2.17s5.06-2.41 8.92-2.17" style="fill:currentColor"/></svg>`;
      } else if (serviceSelect === "spotify") {
        logoContainer.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 162 50" width="162" height="50"><path d="M25.54 0c-13.81 0-25 11.19-25 25s11.19 25 25 25 25-11.19 25-25-11.19-25-25-25M37 36.06q-.16.26-.41.44-.25.19-.55.26t-.61.02q-.31-.04-.57-.21c-5.87-3.58-13.26-4.39-21.96-2.41q-.3.07-.61.02-.3-.05-.57-.22-.26-.16-.44-.41-.18-.26-.25-.56t-.02-.61q.06-.3.22-.56.17-.27.42-.45.25-.17.55-.24c9.53-2.18 17.7-1.24 24.29 2.78q.26.17.44.42.19.25.26.55t.02.61q-.05.3-.21.57m3.06-6.81c-.56.92-1.76 1.21-2.68.64-6.72-4.13-16.96-5.32-24.91-2.91q-.37.11-.76.07-.38-.04-.73-.22-.34-.18-.58-.48-.25-.3-.36-.67t-.08-.76q.04-.38.22-.72.19-.34.49-.59t.67-.36c9.08-2.76 20.36-1.42 28.08 3.32.92.57 1.21 1.77.64 2.68m.27-7.09c-8.06-4.78-21.36-5.22-29.05-2.89-1.23.38-2.54-.32-2.91-1.56q-.14-.44-.09-.91.04-.46.26-.87t.58-.7q.36-.3.8-.43c8.84-2.69 23.52-2.17 32.79 3.34q.4.24.68.61t.4.82q.11.45.04.91-.06.46-.3.86a2.33 2.33 0 0 1-3.2.82m28.23.92c-4.32-1.03-5.09-1.75-5.09-3.27 0-1.43 1.35-2.4 3.36-2.4 1.95 0 3.87.73 5.9 2.24q.09.07.21.05.03 0 .06-.01.02-.01.05-.02l.04-.04.04-.04 2.11-2.97q.03-.05.04-.1t.01-.11q-.01-.05-.04-.1-.03-.04-.07-.08c-2.41-1.93-5.12-2.87-8.29-2.87-4.66 0-7.91 2.8-7.91 6.8 0 4.29 2.8 5.81 7.66 6.98 4.13.96 4.83 1.75 4.83 3.18 0 1.58-1.41 2.56-3.68 2.56-2.52 0-4.58-.85-6.88-2.84q-.02-.02-.04-.03-.03-.02-.05-.02l-.06-.02h-.05q-.03 0-.06.01t-.05.02q-.03.01-.05.03l-.04.04-2.36 2.81q-.04.04-.05.1-.02.05-.02.1.01.06.03.11t.07.09c2.67 2.38 5.96 3.64 9.51 3.64 5.02 0 8.27-2.74 8.27-6.99.01-3.58-2.14-5.57-7.4-6.85m18.77-4.25c-2.18 0-3.96.85-5.44 2.61v-1.98a.28.28 0 0 0-.28-.28h-3.86q-.06 0-.11.02t-.09.06-.06.1q-.02.05-.02.1v21.98c0 .15.12.28.28.28h3.86q.06 0 .11-.02t.09-.06.06-.1q.02-.05.02-.1V34.5c1.48 1.65 3.26 2.46 5.44 2.46 4.05 0 8.14-3.11 8.14-9.07.01-5.95-4.09-9.06-8.14-9.06m3.65 9.06c0 3.03-1.87 5.15-4.55 5.15-2.64 0-4.63-2.21-4.63-5.15 0-2.93 1.99-5.14 4.63-5.14 2.63 0 4.55 2.16 4.55 5.14m14.99-9.06c-5.21 0-9.3 4.01-9.3 9.13 0 5.07 4.06 9.03 9.23 9.03 5.23 0 9.32-3.99 9.32-9.1 0-5.08-4.06-9.06-9.25-9.06m0 14.24c-2.78 0-4.86-2.23-4.86-5.18 0-2.96 2.01-5.11 4.79-5.11 2.79 0 4.89 2.22 4.89 5.18s-2.03 5.11-4.82 5.11m20.38-13.89h-4.26v-4.35c0-.16-.12-.28-.28-.28h-3.86q-.06 0-.11.02t-.09.06-.07.09q-.02.05-.02.11v4.35h-1.85q-.06 0-.11.02t-.09.06-.06.09q-.03.06-.03.11v3.32q0 .06.03.11.02.05.06.09t.09.07q.05.02.11.02h1.85v8.59c0 3.48 1.73 5.24 5.14 5.24 1.39 0 2.54-.29 3.62-.9q.03-.02.06-.05.03-.02.05-.06.02-.03.03-.07.01-.03 0-.07v-3.23q-.01-.04-.03-.07l-.04-.06-.06-.04q-.03-.02-.06-.03l-.08-.02q-.03 0-.07.01-.03.01-.06.03c-.75.37-1.47.54-2.27.54-1.24 0-1.8-.56-1.8-1.82v-7.99h4.26q.05 0 .1-.02.06-.02.1-.06.03-.04.06-.1.02-.05.02-.1v-3.33q0-.05-.02-.1-.02-.06-.06-.1t-.09-.06-.11-.02m14.82.02v-.54c0-1.57.6-2.27 1.95-2.27.81 0 1.46.16 2.18.4q.07.03.13.02.07-.02.13-.06.05-.04.08-.1t.03-.13v-3.25q0-.05-.01-.09-.02-.05-.04-.08-.03-.04-.07-.06-.03-.03-.08-.04c-.76-.23-1.74-.47-3.21-.47-3.57 0-5.46 2.01-5.46 5.82v.81h-1.86q-.05 0-.1.03-.06.02-.1.06t-.06.09-.02.11v3.34c0 .15.13.28.28.28h1.86v13.26c0 .15.13.28.29.28h3.86c.16 0 .28-.13.28-.28V23.07h3.61l5.53 13.26c-.63 1.39-1.24 1.66-2.09 1.66q-1.02 0-2.13-.6-.02-.01-.05-.02t-.06-.01q-.03-.01-.06 0-.02 0-.05.01t-.05.02q-.03.02-.05.04l-.04.04q-.02.02-.03.05l-1.31 2.87q-.02.05-.03.11 0 .05.02.1t.05.09q.04.05.08.07c1.37.74 2.6 1.06 4.13 1.06 2.85 0 4.43-1.33 5.82-4.91l6.71-17.33q.01-.03.01-.06.01-.04 0-.07 0-.04-.01-.07t-.03-.06-.05-.05q-.02-.02-.05-.04-.03-.01-.07-.02-.03-.01-.06-.01h-4.03q-.04 0-.09.01-.04.01-.07.04-.04.03-.07.06l-.04.08-4.12 11.77-4.51-11.78q-.02-.04-.05-.07-.02-.04-.06-.06-.03-.03-.07-.04t-.09-.01zm-8.59-.02h-3.87q-.05 0-.11.02-.05.02-.09.06t-.06.1q-.02.05-.02.1v16.87c0 .15.13.28.28.28h3.87c.15 0 .28-.13.28-.28V19.47q0-.06-.02-.11-.02-.06-.06-.1t-.09-.06q-.06-.02-.11-.02m-1.91-7.68c-1.53 0-2.78 1.24-2.78 2.77q0 .55.21 1.06.22.51.61.9t.9.61q.51.21 1.06.21c1.53 0 2.77-1.24 2.77-2.78q0-.55-.21-1.06-.22-.51-.6-.9-.39-.38-.9-.6-.51-.21-1.06-.21" style="fill:currentColor"/></svg>`;
      } else if (serviceSelect === "youtubemusic") {
        logoContainer.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 50" width="165" height="50" style="fill:currentColor"><path d="M25.41 0C11.38 0 0 11.19 0 25s11.38 25 25.41 25c14.04 0 25.42-11.19 25.42-25 0-13.8-11.38-25-25.42-25m0 41.35a16.35 16.35 0 0 1-15.09-10.1 16.33 16.33 0 0 1 3.55-17.81c4.67-4.67 11.7-6.07 17.81-3.54a16.34 16.34 0 0 1 10.08 15.11c0 2.14-.42 4.27-1.24 6.25s-2.03 3.79-3.54 5.3a16.3 16.3 0 0 1-5.31 3.54c-1.98.83-4.1 1.25-6.25 1.25z"/><path d="M25.52 11.22c-5.58 0-10.61 3.36-12.75 8.51a13.81 13.81 0 0 0 2.99 15.03c3.95 3.94 9.88 5.12 15.03 2.99 5.16-2.14 8.52-7.17 8.52-12.74 0-1.81-.36-3.61-1.05-5.28-.7-1.67-1.71-3.19-2.99-4.48-1.28-1.28-2.8-2.29-4.48-2.98-1.67-.7-3.46-1.05-5.27-1.05M20.21 32.3V17.71L33.54 25zm57.71-12.29c-1.25 6.04-2.09 13.12-2.5 16.24h-.41c-.42-3.12-1.26-10.2-2.51-16.04L69.38 5.63H60V45h5.84V12.5l.62 3.13L72.5 45h5.84l5.83-29.37.42-3.13v32.3h5.83V5.63h-9.58c.21 0-2.92 14.38-2.92 14.38m28.33 18.95q-.21.4-.52.74t-.69.58q-.38.25-.82.39-.43.14-.88.17c-1.25 0-1.88-1.04-1.88-3.55V16.25H94.8V37.5c0 5.21 1.87 7.71 5.83 7.71 2.71 0 4.79-1.25 6.46-3.96h.21l.62 3.55h5.21V16.25h-6.88zm19.59-11.46c-2.09-1.45-3.54-2.5-3.54-4.79q0-2.5 2.49-2.5c1.88 0 2.51 1.25 2.51 5.62l5.62-.2c.42-6.88-1.87-9.79-8.13-9.79-5.62 0-8.53 2.5-8.53 7.5 0 4.58 2.29 6.66 6.04 9.58 3.33 2.5 5.2 3.75 5.2 5.84 0 1.45-1.04 2.49-2.71 2.49-2.08 0-3.12-1.87-2.91-5h-5.62c-.84 6.04 1.66 9.38 8.12 9.38 5.83 0 8.75-2.5 8.75-7.71.41-4.79-2.08-6.67-7.29-10.42m11.25-11.25h6.46V44.8h-6.46zm3.33-11.46c-2.5 0-3.54.83-3.54 3.96 0 3.12 1.25 3.96 3.54 3.96 2.5 0 3.54-.84 3.54-3.96 0-2.92-1.04-3.96-3.54-3.96M165 34.58l-5.83-.21c0 5-.62 6.67-2.5 6.67-1.87 0-2.29-1.88-2.29-7.71V27.7c0-5.83.42-7.49 2.29-7.49 1.88 0 2.29 1.66 2.29 7.08l5.84-.42c.41-4.37-.21-7.5-1.88-9.16-1.25-1.25-3.33-1.88-6.04-1.88-6.46 0-9.17 3.34-9.17 12.92v3.95c0 9.8 2.29 12.93 8.96 12.93 2.71 0 4.79-.63 6.04-1.88 1.67-1.88 2.29-4.79 2.29-9.17"/></svg>`;
      } else if (serviceSelect === "deezer") {
        logoContainer.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 50" width="180" height="50"><path fill-rule="evenodd" d="M101.96 31.92H85.68V12.18h16.28v5.33h-8.6v2.28h8.08v4.36h-8.08v2.43h8.6zm18.12 0H103.8V12.19h16.28v5.33h-8.6v2.28h8.08v4.36h-8.08v2.43h8.6zm50.38 0q-1.24-3.85-3.8-8.17v8.17h-7.7V12.18h10.78c5.23 0 8.55 1.69 8.55 5.28 0 2.36-1.46 3.9-3.9 4.61 2.09 3.61 3.63 6.83 4.75 9.85zM169.32 21c1.14 0 1.78-.62 1.78-1.74 0-1.14-.64-1.74-1.78-1.74h-2.66V21zM157.1 31.92h-16.28V12.18h16.28v5.34h-8.61v2.28h8.09v4.36h-8.09v2.43h8.61zm-35.19-19.74h17.33v5.33c-3.94 3.27-6.74 6.16-8.74 9.07h8.74v5.34h-17.49v-5.34c2.1-3.32 4.81-6.37 8.11-9.07h-7.95zm-57.8 0h9.91c6.14 0 10.47 4.07 10.47 9.87s-4.33 9.87-10.47 9.87h-9.91zm7.7 14.42h1.8c1.93 0 2.95-1.29 2.95-4.55 0-3.25-1.02-4.54-2.95-4.54h-1.8zM42.45 7.63c.47-2.68 1.15-4.36 1.89-4.36h.01c1.4 0 2.54 5.84 2.54 13.07 0 7.21-1.14 13.07-2.55 13.07-.57 0-1.1-1-1.53-2.66-.68 6.09-2.08 10.29-3.71 10.29-1.25 0-2.38-2.52-3.14-6.49-.52 7.54-1.81 12.9-3.34 12.9-.95 0-1.82-2.12-2.46-5.57-.78 7.13-2.57 12.13-4.66 12.13s-3.87-5-4.65-12.13c-.63 3.45-1.51 5.57-2.47 5.57-1.53 0-2.82-5.36-3.34-12.9-.75 3.97-1.88 6.49-3.14 6.49-1.63 0-3.03-4.19-3.7-10.29-.43 1.66-.97 2.66-1.54 2.66-1.41 0-2.55-5.86-2.55-13.07 0-7.23 1.14-13.07 2.55-13.07.76 0 1.42 1.69 1.89 4.36C9.3 3.01 10.52.01 11.9.01c1.63 0 3.05 4.25 3.72 10.42.65-4.49 1.65-7.36 2.76-7.36 1.56 0 2.89 5.63 3.38 13.49.92-4.03 2.26-6.55 3.74-6.55 1.49 0 2.82 2.52 3.75 6.55.49-7.86 1.81-13.49 3.37-13.49 1.12 0 2.11 2.87 2.77 7.36C36.06 4.26 37.47.01 39.11.01c1.37 0 2.6 3 3.34 7.62M1.92 20.89c-.8 0-1.44-2.61-1.44-5.84s.64-5.84 1.44-5.84 1.45 2.61 1.45 5.84-.65 5.84-1.45 5.84m47.16 0c-.8 0-1.45-2.61-1.45-5.84s.65-5.84 1.45-5.84 1.44 2.61 1.44 5.84-.64 5.84-1.44 5.84" style="fill:currentColor"/></svg>`;
      } else if (serviceSelect === "lastfm") {
        logoContainer.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50"><path d="m44.71 45.91-2.36-6.41s-3.83 4.27-9.58 4.27c-5.08 0-8.69-4.42-8.69-11.49 0-9.06 4.57-12.3 9.06-12.3 6.48 0 8.55 4.2 10.31 9.58l2.36 7.36c2.36 7.15 6.78 12.89 19.52 12.89 9.13 0 15.32-2.8 15.32-10.16 0-5.97-3.39-9.06-9.72-10.53l-4.72-1.04c-3.24-.73-4.19-2.06-4.19-4.27 0-2.5 1.98-3.98 5.23-3.98 3.53 0 5.45 1.33 5.74 4.5l7.37-.89c-.59-6.63-5.16-9.35-12.67-9.35-6.63 0-13.11 2.5-13.11 10.53 0 5.01 2.43 8.18 8.54 9.65l5.01 1.18c3.76.88 5.01 2.43 5.01 4.57 0 2.72-2.65 3.83-7.66 3.83-7.44 0-10.54-3.91-12.3-9.28l-2.43-7.37c-3.1-9.58-8.03-13.11-17.83-13.11-10.83 0-16.57 6.85-16.57 18.49 0 11.19 5.74 17.23 16.06 17.23 8.32 0 12.3-3.9 12.3-3.9m-31.52-3.46c-.74.22-1.48.37-2.44.37-1.76 0-3.02-.81-3.02-2.95V-.28H0v41.99c0 5.52 3.83 7.81 8.32 7.81 1.48 0 2.88-.22 4.64-.66zm93.18-1.18c-1.92 1.32-3.54 1.99-5.75 1.99-2.8 0-4.35-1.48-4.35-5.09V20.94h10.17V14.9H96.35V6.72l-7.81.96v7.22h-4.93v6.04h4.93v18.85c0 6.78 3.9 10.02 10.24 10.02 3.46 0 6.55-.66 8.99-2.06zm6.71 2.65c0 3.02 2.36 5.45 5.38 5.45 3.17 0 5.53-2.43 5.53-5.45 0-3.09-2.36-5.45-5.53-5.45-3.02 0-5.38 2.36-5.38 5.45m18.91-22.98v27.99h7.74V20.94h8.69V14.9h-8.69v-3.09c0-4.64 1.99-6.12 5.23-6.12 2.28 0 3.83.52 5.59 1.48l1.26-6.49c-2.07-.95-4.5-1.47-7.44-1.47-6.49 0-12.38 3.09-12.38 12.3v3.39h-4.93v6.04zm47.24.66c-.88-5.52-4.49-7.51-9.21-7.51-4.71 0-8.76 2.14-10.53 7.37l-.96-6.56h-6.26v34.03h7.74V29.71c0-6.56 3.39-9.07 6.99-9.07 3.76 0 5.31 2.51 5.31 6.56v21.73h7.66v-19.3c0-6.48 3.46-8.99 7.07-8.99 3.68 0 5.23 2.51 5.23 6.56v21.73H200V24.48c0-7.3-4.27-10.39-9.94-10.39-4.79 0-9.06 2.14-10.83 7.51" style="fill:currentColor"/></svg>`;
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
