/*
 * BubbleFM
 * Copyright (c) 2026 SnowMint
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

import * as htmlToImage from 'html-to-image';

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateWithEllipsis(str, maxLength = 20) {
  if (!str) return "";
  const s = String(str).trim();
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength).trimEnd() + "...";
}

function getAffinityTier(percentage) {
  if (percentage >= 100) return "SUPER FRIENDS";
  if (percentage >= 90) return "SOUL SYNCHRONIZED";
  if (percentage >= 80) return "MUSIC TWINS";
  if (percentage >= 70) return "VIBE PARTNERS";
  if (percentage >= 60) return "SOUND NEIGHBORS";
  if (percentage >= 50) return "COMMON GROUND";
  if (percentage >= 40) return "OCCASIONAL OVERLAP";
  if (percentage >= 30) return "CASUAL ACQUAINTANCES";
  if (percentage >= 20) return "DISTANT WAVES";
  if (percentage >= 10) return "PARALLEL LINES";
  return "TOTAL STRANGERS";
}

const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M451.5-771.5Q440-783 440-800v-80q0-17 11.5-28.5T480-920t28.5 11.5T520-880v80q0 17-11.5 28.5T480-760t-28.5-11.5M678-678q-11-11-11-27.5t11-28.5l56-57q12-12 28.5-12t28.5 12q11 11 11 28t-11 28l-57 57q-11 11-28 11t-28-11m122 238q-17 0-28.5-11.5T760-480t11.5-28.5T800-520h80q17 0 28.5 11.5T920-480t-11.5 28.5T880-440zM451.5-51.5Q440-63 440-80v-80q0-17 11.5-28.5T480-200t28.5 11.5T520-160v80q0 17-11.5 28.5T480-40t-28.5-11.5M226-678l-57-56q-12-12-12-29t12-28q11-11 28-11t28 11l57 57q11 11 11 28t-11 28q-12 11-28 11t-28-11m508 509-56-57q-11-12-11-28.5t11-27.5 27.5-11 28.5 11l57 56q12 11 11.5 28T791-169q-12 12-29 12t-28-12M80-440q-17 0-28.5-11.5T40-480t11.5-28.5T80-520h80q17 0 28.5 11.5T200-480t-11.5 28.5T160-440zm89 271q-11-11-11-28t11-28l57-57q11-11 27.5-11t28.5 11q12 12 12 28.5T282-225l-56 56q-12 12-29 12t-28-12m141-141q-70-70-70-170t70-170 170-70 170 70 70 170-70 170-170 70-170-70m283-57q47-47 47-113t-47-113-113-47-113 47-47 113 47 113 113 47 113-47M480-480"/></svg>`;
const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M484-80q-84 0-157.5-32t-128-86.5-86.5-128T80-484q0-128 72-232t193-146q22-8 41 5.5t18 36.5q-3 85 27 162t90 137 137 90 162 27q26-1 38.5 17.5T863-345q-44 120-147.5 192.5T484-80m0-80q88 0 163-44t118-121q-86-8-163-43.5T464-465t-97-138-43-163q-77 43-120.5 118.5T160-484q0 135 94.5 229.5T484-160m-20-305"/></svg>`;

const lastfmBaseUrl = "https://bubblefm.snw-mint.workers.dev/data";

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
  let cleanQuery = (query || "").replace(/["']/g, "").trim();
  if (type === "artist" && cleanQuery.includes(",")) {
    cleanQuery = cleanQuery.split(",")[0].trim();
  }
  if (!cleanQuery) return null;
  try {
    const jsonpData = await fetchDeezerJsonp(type, cleanQuery);
    if (jsonpData && jsonpData.data && jsonpData.data.length > 0) return jsonpData;
  } catch (e) {
    console.warn("Deezer JSONP fetch warning:", e);
  }
  return null;
}

function initFaqModal() {
  const faqToggle = document.getElementById("faq-toggle");
  if (!faqToggle) return;

  let faqModal = document.getElementById("faqModal");
  if (!faqModal) {
    faqModal = document.createElement("div");
    faqModal.id = "faqModal";
    faqModal.className = "modal";
    faqModal.setAttribute("aria-hidden", "true");
    faqModal.innerHTML = `
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
                <li>strong>Design Feedback:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=feedback.yml" target="_blank" rel="noopener noreferrer">Propose a design or UI improvement</a></li>
                <li><strong>Feature Ideas:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=feature.yml" target="_blank" rel="noopener noreferrer">Suggest a new feature</a></li>
                <li><strong>Bug Reports:</strong> <a href="https://github.com/snw-mint/bubblefm/issues/new?template=bug.yml" target="_blank" rel="noopener noreferrer">Report an issue or bug</a></li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    `;
    document.body.appendChild(faqModal);
  }

  const faqCloseBtn = document.getElementById("faqCloseBtn");

  const openFaq = () => {
    faqModal.classList.add("show");
    faqModal.setAttribute("aria-hidden", "false");

    try {
      const count = parseInt(localStorage.getItem("bubblefm_faq_open_count") || "0", 10) + 1;
      localStorage.setItem("bubblefm_faq_open_count", count.toString());
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

function showToast(message) {
  let toast = document.getElementById("bubbleToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "bubbleToast";
    toast.className = "bubble-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

async function handleShareMatch(user1, user2) {
  const shareUrl = `${window.location.origin}/match/result.html?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`;
  const shareText = `Check out the music taste match between ${user1} and ${user2} on BubbleFM!`;

  if (typeof umami !== "undefined") {
    umami.track("Share Clicked", { type: "match" });
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `BubbleFM - ${user1} & ${user2} TasteMatch`,
        text: shareText,
        url: shareUrl,
      });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast("Match link copied to clipboard!");
  } catch (err) {
    showToast("Failed to copy link");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const themeToggle = document.getElementById("theme-toggle");
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const currentTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (themeToggle) {
      themeToggle.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
    }
  }

  setTheme(currentTheme);
  initFaqModal();

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "light" : "dark");
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const user1 = urlParams.get("user1") || sessionStorage.getItem("lastfm_user1");
  const user2 = urlParams.get("user2") || sessionStorage.getItem("lastfm_user2");

  if (!user1 || !user2 || user1.toLowerCase().trim() === user2.toLowerCase().trim()) {
    window.location.href = "index.html";
    return;
  }

  sessionStorage.setItem("lastfm_user1", user1);
  sessionStorage.setItem("lastfm_user2", user2);
  if (!urlParams.get("user1") || !urlParams.get("user2")) {
    const newUrl = `result.html?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`;
    window.history.replaceState(null, "", newUrl);
  }

  const btnShareMatch = document.getElementById("btnShareMatch");
  if (btnShareMatch) {
    btnShareMatch.addEventListener("click", () => handleShareMatch(user1, user2));
  }
  const shareToggle = document.getElementById("share-toggle");
  if (shareToggle) {
    shareToggle.addEventListener("click", () => handleShareMatch(user1, user2));
  }

  try {
    const [
      info1Res,
      info2Res,
      artists1Res,
      artists2Res,
      tracks1Res,
      tracks2Res,
      albums1Res,
      albums2Res,
    ] = await Promise.all([
      fetch(`${lastfmBaseUrl}?method=user.getinfo&user=${user1}&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.getinfo&user=${user2}&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettopartists&user=${user1}&period=1month&limit=100&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettopartists&user=${user2}&period=1month&limit=100&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettoptracks&user=${user1}&period=1month&limit=10&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettoptracks&user=${user2}&period=1month&limit=10&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettopalbums&user=${user1}&period=1month&limit=10&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettopalbums&user=${user2}&period=1month&limit=10&_t=${Date.now()}`)
    ]);

    const info1 = await info1Res.json();
    const info2 = await info2Res.json();
    const artists1Data = await artists1Res.json();
    const artists2Data = await artists2Res.json();
    const tracks1Data = await tracks1Res.json();
    const tracks2Data = await tracks2Res.json();
    const albums1Data = await albums1Res.json();
    const albums2Data = await albums2Res.json();

    if (info1.user) {
      document.getElementById("userDisplayName1").textContent = info1.user.name;
      const titleEl1 = document.getElementById("titleUser1Vibe");
      if (titleEl1) titleEl1.innerHTML = `${info1.user.name}'s <span class="highlight-serif">vibe</span>`;
      document.getElementById("userDisplayName1").classList.remove("skeleton", "skeleton-text");
      document.getElementById("userDisplayName1").removeAttribute("style");

      document.getElementById("userScrobbles1").textContent = parseInt(info1.user.playcount).toLocaleString();
      document.getElementById("userScrobbles1").classList.remove("skeleton", "skeleton-text");
      document.getElementById("userScrobbles1").removeAttribute("style");

      const artistsCount1 = artists1Data.topartists?.["@attr"]?.total || "0";
      document.getElementById("userArtists1").textContent = parseInt(artistsCount1).toLocaleString();
      document.getElementById("userArtists1").classList.remove("skeleton", "skeleton-text");
      document.getElementById("userArtists1").removeAttribute("style");

      const avatar = document.getElementById("userAvatar1");
      const lastfmImage = info1.user.image?.find((img) => img.size === "extralarge" || img.size === "large")?.["#text"];
      if (lastfmImage && !lastfmImage.includes("default_user")) {
        avatar.src = lastfmImage;
        avatar.style.display = "block";
        document.getElementById("userAvatarContainer1").classList.remove("skeleton", "skeleton-icon");
        document.getElementById("userAvatarSkeletonIcon1").style.display = "none";
      } else {
        avatar.src = "/assets/default_avatar.png";
      }
    }

    if (info2.user) {
      document.getElementById("userDisplayName2").textContent = info2.user.name;
      const titleEl2 = document.getElementById("titleUser2Vibe");
      if (titleEl2) titleEl2.innerHTML = `${info2.user.name}'s <span class="highlight-serif">vibe</span>`;
      document.getElementById("userDisplayName2").classList.remove("skeleton", "skeleton-text");
      document.getElementById("userDisplayName2").removeAttribute("style");

      document.getElementById("userScrobbles2").textContent = parseInt(info2.user.playcount).toLocaleString();
      document.getElementById("userScrobbles2").classList.remove("skeleton", "skeleton-text");
      document.getElementById("userScrobbles2").removeAttribute("style");

      const artistsCount2 = artists2Data.topartists?.["@attr"]?.total || "0";
      document.getElementById("userArtists2").textContent = parseInt(artistsCount2).toLocaleString();
      document.getElementById("userArtists2").classList.remove("skeleton", "skeleton-text");
      document.getElementById("userArtists2").removeAttribute("style");

      const avatar = document.getElementById("userAvatar2");
      const lastfmImage = info2.user.image?.find((img) => img.size === "extralarge" || img.size === "large")?.["#text"];
      if (lastfmImage && !lastfmImage.includes("default_user")) {
        avatar.src = lastfmImage;
        avatar.style.display = "block";
        document.getElementById("userAvatarContainer2").classList.remove("skeleton", "skeleton-icon");
        document.getElementById("userAvatarSkeletonIcon2").style.display = "none";
      }
    }

    let list1 = artists1Data.topartists?.artist || [];
    let list2 = artists2Data.topartists?.artist || [];

    if (!Array.isArray(list1)) list1 = [list1];
    if (!Array.isArray(list2)) list2 = [list2];

    const map1 = new Map(list1.map((a, i) => [a.name.toLowerCase(), { ...a, rank: i + 1 }]));
    const map2 = new Map(list2.map((a, i) => [a.name.toLowerCase(), { ...a, rank: i + 1 }]));

    const common = [];

    for (const a1 of list1) {
      const nameKey = a1.name.toLowerCase();
      if (map2.has(nameKey)) {
        common.push({
          name: a1.name,
          score: map1.get(nameKey).rank + map2.get(nameKey).rank,
          playcount: parseInt(a1.playcount) + parseInt(map2.get(nameKey).playcount),
        });
      }
    }
    common.sort((a, b) => a.score - b.score || b.playcount - a.playcount);

    const maxPossibleCommon = Math.min(list1.length, list2.length);
    let matchPercentage = 0;
    if (maxPossibleCommon > 0) {
      matchPercentage = Math.round((common.length / maxPossibleCommon) * 100);
    }

    const tastometerText = document.getElementById("tastometerText");
    const tastometerProgress = document.getElementById("tastometerProgress");

    let currentPercent = 0;
    const duration = 1500;
    const interval = 20;
    const step = matchPercentage / (duration / interval);

    if (matchPercentage > 0) {
      const timer = setInterval(() => {
        currentPercent += step;
        if (currentPercent >= matchPercentage) {
          currentPercent = matchPercentage;
          clearInterval(timer);
        }
        tastometerText.textContent = Math.round(currentPercent) + "%";
      }, interval);
    } else {
      tastometerText.textContent = "0%";
    }

    setTimeout(() => {
      const dashoffset = 282.74 - (282.74 * matchPercentage) / 100;
      tastometerProgress.style.strokeDashoffset = dashoffset;
    }, 100);

    const renderList = async (elementId, msgId, items, emptyMessage, isCommon = false) => {
      const container = document.getElementById(elementId);
      const msgDiv = document.getElementById(msgId);

      container.innerHTML = "";

      if (items.length === 0) {
        msgDiv.textContent = emptyMessage;
        msgDiv.style.display = "block";
        container.appendChild(msgDiv);
        return null;
      }

      msgDiv.style.display = "none";
      container.appendChild(msgDiv);

      const top10 = items.slice(0, 10);
      let top1Image = null;

      for (let i = 0; i < top10.length; i++) {
        const item = top10[i];
        let displayName = item.name;
        if (displayName.includes(",")) {
          displayName = displayName.split(",")[0].trim();
        }

        if (i === 0) {
          const html = `
            <div class="chart-item top-1">
              <div class="top1-image skeleton skeleton-icon" id="${elementId}-imgSkeleton">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-300q75 0 127.5-52.5T660-480q0-75-52.5-127.5T480-660q-75 0-127.5 52.5T300-480q0 75 52.5 127.5T480-300Zm-28.5-151.5Q440-463 440-480t11.5-28.5Q463-520 480-520t28.5 11.5Q520-497 520-480t-11.5 28.5Q497-440 480-440t-28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm100-95.5q47-15.5 86-44.5-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160q53 0 100-15.5ZM523-537q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm-43-43Zm0 360Z"/></svg>
              </div>
              <img class="top1-image" id="${elementId}-img" alt="Top 1" style="display: none" />
              <div class="text-content">
                <span style="font-weight: bold; color: #ffffff !important;">${displayName}</span>
                <span style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.8) !important;">${isCommon ? item.playcount + " plays together" : item.playcount + " streams"}</span>
              </div>
            </div>
          `;
          container.insertAdjacentHTML("beforeend", html);
          try {
            const data = await fetchAssetData("artist", item.name);
            if (data && data.data && data.data.length > 0) {
              const bestArtist = selectBestArtist(data.data, item.name);
              if (bestArtist) {
                top1Image = bestArtist;
                const imgEl = document.getElementById(`${elementId}-img`);
                imgEl.src = bestArtist.picture_medium || bestArtist.picture;
                imgEl.style.display = "block";
                document.getElementById(`${elementId}-imgSkeleton`).style.display = "none";
              }
            }
          } catch (e) {
            console.warn(e);
          }
        } else {
          const html = `
            <div class="chart-item">
              <span style="font-weight: bold; margin-right: 15px; color: var(--color-neutral-500)">#${i + 1}</span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${displayName}</span>
            </div>
          `;
          container.insertAdjacentHTML("beforeend", html);
        }
      }
      return top1Image;
    };

    const commonImg = await renderList(
      "listCommonArtists",
      "msgCommonArtists",
      common,
      "You don't have any artists in common. Opposites attract!",
      true,
    );
    const u1FallbackImg = await renderList(
      "listUser1Vibe",
      "msgUser1Vibe",
      list1,
      "No top artists found for this period.",
    );
    await renderList("listUser2Vibe", "msgUser2Vibe", list2, "No top artists found for this period.");
    const coverSource = commonImg || u1FallbackImg;
    if (coverSource) {
      const coverUrl = coverSource.picture_xl || coverSource.picture_big || coverSource.picture;
      document.getElementById("artistCover").src = coverUrl;
      document.getElementById("artistCover").style.display = "block";
      document.getElementById("coverContainer").classList.remove("skeleton", "skeleton-icon");
      document.getElementById("coverSkeletonIcon").style.display = "none";
    }

    let rawArtists1 = artists1Data.topartists?.artist || [];
    if (!Array.isArray(rawArtists1)) rawArtists1 = [rawArtists1];
    const topArtists1 = rawArtists1.slice(0, 3).map((a) => ({
      name: a.name,
      playcount: parseInt(a.playcount || "0", 10),
    }));

    let rawArtists2 = artists2Data.topartists?.artist || [];
    if (!Array.isArray(rawArtists2)) rawArtists2 = [rawArtists2];
    const topArtists2 = rawArtists2.slice(0, 3).map((a) => ({
      name: a.name,
      playcount: parseInt(a.playcount || "0", 10),
    }));

    let rawTracks1 = tracks1Data.toptracks?.track || [];
    if (!Array.isArray(rawTracks1)) rawTracks1 = [rawTracks1];
    const topTracks1 = rawTracks1.slice(0, 3).map((t) => ({
      name: t.name,
      artist: { name: t.artist?.name || t.artist?.["#text"] || "" },
      playcount: parseInt(t.playcount || "0", 10),
    }));

    let rawTracks2 = tracks2Data.toptracks?.track || [];
    if (!Array.isArray(rawTracks2)) rawTracks2 = [rawTracks2];
    const topTracks2 = rawTracks2.slice(0, 3).map((t) => ({
      name: t.name,
      artist: { name: t.artist?.name || t.artist?.["#text"] || "" },
      playcount: parseInt(t.playcount || "0", 10),
    }));

    let rawAlbums1 = albums1Data.topalbums?.album || [];
    if (!Array.isArray(rawAlbums1)) rawAlbums1 = [rawAlbums1];
    const topAlbums1 = rawAlbums1.slice(0, 3).map((al) => ({
      name: al.name,
      artist: { name: al.artist?.name || al.artist?.["#text"] || "" },
      playcount: parseInt(al.playcount || "0", 10),
    }));

    let rawAlbums2 = albums2Data.topalbums?.album || [];
    if (!Array.isArray(rawAlbums2)) rawAlbums2 = [rawAlbums2];
    const topAlbums2 = rawAlbums2.slice(0, 3).map((al) => ({
      name: al.name,
      artist: { name: al.artist?.name || al.artist?.["#text"] || "" },
      playcount: parseInt(al.playcount || "0", 10),
    }));

    initCardGenerator({
      user1,
      user2,
      displayName1: info1.user?.name || user1,
      displayName2: info2.user?.name || user2,
      matchPercentage,
      user1Data: {
        artists: topArtists1,
        tracks: topTracks1,
        albums: topAlbums1,
      },
      user2Data: {
        artists: topArtists2,
        tracks: topTracks2,
        albums: topAlbums2,
      },
    });
  } catch (error) {
    console.error("Error fetching match data:", error);
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

function initCardGenerator(matchContext) {
  const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
  const settingsModal = document.getElementById("generationSettingsModal");
  const closeSettings = document.getElementById("closeSettingsModal");
  const confirmSettings = document.getElementById("confirmSettingsBtn");
  const bgOptions = document.querySelectorAll(".bg-option");
  const fabActions = document.getElementById("fabActions") || btnGerarRelatorio;
  const themeToggleCheckbox = document.getElementById("themeToggleCheckbox");
  const cardElement = document.getElementById("storyCard");

  if (fabActions) {
    fabActions.classList.remove("hidden");
  }

  bgOptions.forEach((option) => {
    option.addEventListener("click", () => {
      bgOptions.forEach((opt) => opt.classList.remove("selected"));
      option.classList.add("selected");
    });
  });

  if (btnGerarRelatorio && settingsModal) {
    btnGerarRelatorio.addEventListener("click", () => {
      if (typeof umami !== "undefined") {
        umami.track("Match Card Modal Opened");
      }
      if (themeToggleCheckbox) {
        themeToggleCheckbox.checked = document.documentElement.getAttribute("data-theme") === "light";
      }
      if (cardElement) {
        cardElement.className = themeToggleCheckbox && themeToggleCheckbox.checked ? "theme-light" : "theme-dark";
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

  if (themeToggleCheckbox && cardElement) {
    themeToggleCheckbox.addEventListener("change", () => {
      cardElement.className = themeToggleCheckbox.checked ? "theme-light" : "theme-dark";
    });
  }

  if (confirmSettings && cardElement) {
    confirmSettings.addEventListener("click", async () => {
      settingsModal.classList.remove("show");

      const selectedBgOption = document.querySelector(".bg-option.selected");
      const selectedBg = selectedBgOption ? selectedBgOption.dataset.bg : "red";
      const isLight = Boolean(themeToggleCheckbox && themeToggleCheckbox.checked);

      cardElement.className = isLight ? "theme-light" : "theme-dark";

      const cardBgImg = document.getElementById("storyCardBackgroundImg");
      if (cardBgImg) {
        cardBgImg.src = `/assets/bg/${selectedBg}.webp`;
      }

      document.getElementById("storyCardTitle").textContent = "Match";
      document.getElementById("storyMatchScore").textContent = `${matchContext.matchPercentage}%`;

      const tierName = getAffinityTier(matchContext.matchPercentage);
      document.getElementById("storyMonthYear").textContent = tierName;
      document.getElementById("storyTotalMinutes").textContent = `${matchContext.displayName1} & ${matchContext.displayName2}`;

      const cleanCardTitle = (str) => {
        if (!str) return "";
        const cleaned = String(str).replace(/\s*\([^)]*\)/g, "").trim();
        return cleaned || String(str).trim();
      };

      const populateList = (containerId, items, isTrackOrAlbum = false) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";
        const top3 = (items || []).slice(0, 3);
        top3.forEach((item, index) => {
          const rank = index + 1;
          const rawSubText = item.artist ? item.artist.name : `${item.playcount} streams`;
          const rawName = isTrackOrAlbum ? cleanCardTitle(item.name) : item.name;
          const displayName = truncateWithEllipsis(rawName, 22);
          const displaySub = truncateWithEllipsis(rawSubText, 28);
          container.innerHTML += `
            <div class="story-item-row">
              <span class="story-item-rank">${rank}</span>
              <div class="story-item-details">
                <span class="story-item-name" title="${escapeHTML(rawName)}">${escapeHTML(displayName)}</span>
                <span class="story-item-sub" title="${escapeHTML(rawSubText)}">${escapeHTML(displaySub)}</span>
              </div>
            </div>
          `;
        });
      };

      populateList("storyListArtists1", matchContext.user1Data.artists, false);
      populateList("storyListSongs1", matchContext.user1Data.tracks, true);
      populateList("storyListAlbums1", matchContext.user1Data.albums, true);

      populateList("storyListArtists2", matchContext.user2Data.artists, false);
      populateList("storyListSongs2", matchContext.user2Data.tracks, true);
      populateList("storyListAlbums2", matchContext.user2Data.albums, true);

      const generationModal = document.getElementById("generationModal");
      const stateLoading = document.getElementById("generationStateLoading");
      const stateComplete = document.getElementById("generationStateComplete");

      if (generationModal) {
        stateLoading.style.display = "flex";
        stateComplete.style.display = "none";
        generationModal.classList.add("show");
      }

      confirmSettings.textContent = "Generating...";

      setTimeout(() => {
        htmlToImage
          .toPng(cardElement, {
            pixelRatio: 2,
            backgroundColor: null,
            cacheBust: true,
          })
          .then((dataUrl) => {
            const link = document.createElement("a");
            link.download = `bubblefm_match_${matchContext.user1}_${matchContext.user2}_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

            if (typeof umami !== "undefined") {
              umami.track("Match Card Generated", {
                color: selectedBg,
                theme: isLight ? "light" : "dark",
                score: matchContext.matchPercentage,
              });
            }

            confirmSettings.textContent = "Generate Card";

            if (generationModal) {
              stateLoading.style.display = "none";
              stateComplete.style.display = "flex";
              setTimeout(() => {
                generationModal.classList.remove("show");
              }, 2500);
            }
          })
          .catch((err) => {
            console.error("Error generating match card:", err);
            confirmSettings.textContent = "Error";
            if (generationModal) {
              generationModal.classList.remove("show");
            }
          });
      }, 1000);
    });
  }
}
