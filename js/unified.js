/*
 * BubbleFM
 * Copyright (c) 2026 SnowMint
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M451.5-771.5Q440-783 440-800v-80q0-17 11.5-28.5T480-920t28.5 11.5T520-880v80q0 17-11.5 28.5T480-760t-28.5-11.5M678-678q-11-11-11-27.5t11-28.5l56-57q12-12 28.5-12t28.5 12q11 11 11 28t-11 28l-57 57q-11 11-28 11t-28-11m122 238q-17 0-28.5-11.5T760-480t11.5-28.5T800-520h80q17 0 28.5 11.5T920-480t-11.5 28.5T880-440zM451.5-51.5Q440-63 440-80v-80q0-17 11.5-28.5T480-200t28.5 11.5T520-160v80q0 17-11.5 28.5T480-40t-28.5-11.5M226-678l-57-56q-12-12-12-29t12-28q11-11 28-11t28 11l57 57q11 11 11 28t-11 28q-12 11-28 11t-28-11m508 509-56-57q-11-12-11-28.5t11-27.5 27.5-11 28.5 11l57 56q12 11 11.5 28T791-169q-12 12-29 12t-28-12M80-440q-17 0-28.5-11.5T40-480t11.5-28.5T80-520h80q17 0 28.5 11.5T200-480t-11.5 28.5T160-440zm89 271q-11-11-11-28t11-28l57-57q11-11 27.5-11t28.5 11q12 12 12 28.5T282-225l-56 56q-12 12-29 12t-28-12m141-141q-70-70-70-170t70-170 170-70 170 70 70 170-70 170-170 70-170-70"/></svg>`;
const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z"/></svg>`;

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

  const formUsername = document.getElementById("form-username");
  if (formUsername) {
    formUsername.addEventListener("submit", (e) => {
      e.preventDefault();
      const userInput = document.getElementById("userInput").value.trim();
      if (userInput) {
        sessionStorage.setItem("lastfm_user", userInput);
        if (typeof umami !== 'undefined') {
          umami.track('Search Initiated', { type: 'single' });
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
        if (typeof umami !== 'undefined') {
          umami.track('Search Initiated', { type: 'match' });
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

      const toggleBtns = document.querySelectorAll(".time-toggle-btn");
      if (toggleBtns.length > 0) {
        toggleBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            if (btn.classList.contains("active")) return;

            toggleBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            currentPeriod = btn.getAttribute("data-period");
            resetToSkeletons();
            fetchLastfmAndDeezerData(user, currentPeriod);
          });
        });
      }

      fetchLastfmAndDeezerData(user, currentPeriod);
    }
  }
});

function resetToSkeletons() {
  const textFields = ["userScrobbles", "userMinutes", "userDailyAvg"];
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
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#2</span> <span class="skeleton skeleton-text" style="width: 150px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#3</span> <span class="skeleton skeleton-text" style="width: 130px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#4</span> <span class="skeleton skeleton-text" style="width: 160px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#5</span> <span class="skeleton skeleton-text" style="width: 140px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#6</span> <span class="skeleton skeleton-text" style="width: 170px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#7</span> <span class="skeleton skeleton-text" style="width: 120px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#8</span> <span class="skeleton skeleton-text" style="width: 145px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#9</span> <span class="skeleton skeleton-text" style="width: 155px; height: 16px;"></span></div>
        <div class="chart-item"><span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#10</span> <span class="skeleton skeleton-text" style="width: 135px; height: 16px;"></span></div>
      `;
    }
  });
}

const periodCache = {};

async function fetchLastfmAndDeezerData(username, period = "month") {
  if (periodCache[period]) {
    console.log(`Using cached data for ${username} (period: ${period})`);
    renderData(username, periodCache[period]);
    return;
  }

  try {
    console.log(`Fetching data for ${username} (period: ${period})`);
    const lastfmBaseUrl = "https://bubblefm.snw-mint.workers.dev/data";
    const assetsBaseUrl = "https://bubblefm.snw-mint.workers.dev/assets";

    let from, to;
    const now = new Date();
    to = Math.floor(now.getTime() / 1000);

    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      from = Math.floor(startOfMonth.getTime() / 1000);
    } else if (period === "week") {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      from = Math.floor(startOfWeek.getTime() / 1000);
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

    const assetPromises = [];

    if (topArtistName) {
      assetPromises.push(
        fetch(`${assetsBaseUrl}?type=artist&query=${encodeURIComponent(topArtistName)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.data && data.data.length > 0) {
              artistImage = data.data[0].picture_medium || data.data[0].picture;
              artistCoverImage = data.data[0].picture_xl || data.data[0].picture_big || data.data[0].picture;
            }
          })
          .catch((err) => console.error(err)),
      );
    }

    if (topAlbumName) {
      const albumQuery = `${topAlbumName} ${topAlbumArtist || ""}`.trim();
      assetPromises.push(
        fetch(`${assetsBaseUrl}?type=album&query=${encodeURIComponent(albumQuery)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.data && data.data.length > 0) {
              albumImage = data.data[0].cover_medium || data.data[0].cover;
            }
          })
          .catch((err) => console.error(err)),
      );
    }

    if (topTrackName) {
      const trackQuery = `${topTrackName} ${topTrackArtist || ""}`.trim();
      assetPromises.push(
        fetch(`${assetsBaseUrl}?type=album&query=${encodeURIComponent(trackQuery)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.data && data.data.length > 0) {
              trackImage = data.data[0].cover_medium || data.data[0].cover;
            }
          })
          .catch((err) => console.error(err)),
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
    };

    periodCache[period] = data;
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
  } = data;

  function renderList(listId, items, type) {
    const container = document.getElementById(listId);
    if (!container || !items || items.length === 0) return;

    let html = "";
    items.slice(0, 10).forEach((item, index) => {
      const rank = index + 1;
      const name = escapeHTML(item.name);
      const playcount = parseInt(item.playcount || 0, 10).toLocaleString("en-US");

      if (rank === 1) {
        let subText = "";
        if (type === "artist") {
          subText = `${playcount} plays`;
        } else if (type === "track" || type === "album") {
          subText = `${escapeHTML(item.artist.name)} - ${playcount} plays`;
        }

        html += `
                    <div class="chart-item top-1">
                        <div class="top1-image skeleton skeleton-icon" id="${type}1Skeleton">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-300q75 0 127.5-52.5T660-480q0-75-52.5-127.5T480-660q-75 0-127.5 52.5T300-480q0 75 52.5 127.5T480-300Zm-28.5-151.5Q440-463 440-480t11.5-28.5Q463-520 480-520t28.5 11.5Q520-497 520-480t-11.5 28.5Q497-440 480-440t-28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                        </div>
                        <img class="top1-image" id="${type}1Img" alt="Top ${type}" style="display: none;" />
                        <div class="text-content">
                            <span>${name}</span>
                            <span style="font-size: 0.9rem; opacity: 0.8;">${subText}</span>
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
                    <div class="chart-item">
                        <span style="font-weight: bold; margin-right: 15px; color: var(--color-primary);">#${rank}</span> ${text}
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
      chartsTimeTextEl.textContent = `Showing charts for ${mStr}`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
  const columnPickerModal = document.getElementById("columnPickerModal");
  const closeColumnPicker = document.getElementById("closeColumnPicker");
  const chartColOptions = document.querySelectorAll(".chart-col-option");
  const confirmColumnsBtn = document.getElementById("confirmColumnsBtn");

  if (btnGerarRelatorio && columnPickerModal) {
    btnGerarRelatorio.addEventListener("click", () => {
      columnPickerModal.classList.add("show");
    });

    if (closeColumnPicker) {
      closeColumnPicker.addEventListener("click", () => {
        columnPickerModal.classList.remove("show");
      });
    }

    columnPickerModal.addEventListener("click", (e) => {
      if (e.target === columnPickerModal) {
        columnPickerModal.classList.remove("show");
      }
    });
  }

  if (chartColOptions.length > 0) {
    chartColOptions.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const row = checkbox.closest(".custom-checkbox-row");
        if (checkbox.checked) {
          row.classList.add("checked");
        } else {
          row.classList.remove("checked");
        }

        const selectedCount = Array.from(chartColOptions).filter((cb) => cb.checked).length;

        if (selectedCount >= 2) {
          chartColOptions.forEach((cb) => {
            if (!cb.checked) {
              cb.disabled = true;
              cb.closest(".custom-checkbox-row").classList.add("disabled");
            }
          });
        } else {
          chartColOptions.forEach((cb) => {
            cb.disabled = false;
            cb.closest(".custom-checkbox-row").classList.remove("disabled");
          });
        }

        if (selectedCount > 0 && selectedCount <= 2) {
          confirmColumnsBtn.disabled = false;
        } else {
          confirmColumnsBtn.disabled = true;
        }
      });

      const row = checkbox.closest(".custom-checkbox-row");
      row.addEventListener("click", (e) => {
        if (e.target !== checkbox && !checkbox.disabled) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event("change"));
        }
      });
    });
  }

  const colorPickerModal = document.getElementById("colorPickerModal");
  const closeColorPicker = document.getElementById("closeColorPicker");
  const colorOptions = document.querySelectorAll(".color-option");
  const customColorBtn = document.getElementById("customColorBtn");
  const customColorPicker = document.getElementById("customColorPicker");
  const confirmColorBtn = document.getElementById("confirmColorBtn");

  let selectedColor = null;

  if (confirmColumnsBtn && colorPickerModal) {
    confirmColumnsBtn.addEventListener("click", () => {
      columnPickerModal.classList.remove("show");
      colorPickerModal.classList.add("show");
    });

    if (closeColorPicker) {
      closeColorPicker.addEventListener("click", () => {
        colorPickerModal.classList.remove("show");
      });
    }

    colorPickerModal.addEventListener("click", (e) => {
      if (e.target === colorPickerModal) {
        colorPickerModal.classList.remove("show");
      }
    });
  }

  if (colorOptions.length > 0) {
    colorOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.id === "customColorBtn") {
          customColorPicker.click();
          return;
        }

        colorOptions.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = btn.dataset.color;

        if (confirmColorBtn) confirmColorBtn.disabled = false;
      });
    });
  }

  if (customColorPicker) {
    customColorPicker.addEventListener("input", (e) => {
      const hexColor = e.target.value;
      customColorBtn.style.backgroundColor = hexColor;

      colorOptions.forEach((b) => b.classList.remove("selected"));
      customColorBtn.classList.add("selected");
      selectedColor = hexColor;

      if (confirmColorBtn) confirmColorBtn.disabled = false;
    });
  }

  const imagePickerModal = document.getElementById("imagePickerModal");
  const closeImagePicker = document.getElementById("closeImagePicker");
  const defaultBgCard = document.getElementById("defaultBgCard");
  const customBgCard = document.getElementById("customBgCard");
  const customBgInput = document.getElementById("customBgInput");
  const confirmImageBtn = document.getElementById("confirmImageBtn");

  let selectedBgType = null;
  let customBgDataUrl = null;

  if (confirmColorBtn && imagePickerModal) {
    confirmColorBtn.addEventListener("click", () => {
      colorPickerModal.classList.remove("show");
      imagePickerModal.classList.add("show");
    });

    if (closeImagePicker) {
      closeImagePicker.addEventListener("click", () => {
        imagePickerModal.classList.remove("show");
      });
    }

    imagePickerModal.addEventListener("click", (e) => {
      if (e.target === imagePickerModal) {
        imagePickerModal.classList.remove("show");
      }
    });
  }

  if (defaultBgCard && customBgCard) {
    defaultBgCard.addEventListener("click", () => {
      defaultBgCard.classList.add("selected");
      customBgCard.classList.remove("selected");
      selectedBgType = "default";
      if (confirmImageBtn) confirmImageBtn.disabled = false;
    });

    customBgCard.addEventListener("click", (e) => {
      if (e.target.tagName.toLowerCase() !== "input") {
        customBgInput.click();
      }
    });
  }

  if (customBgInput) {
    customBgInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          customBgDataUrl = event.target.result;
          selectedBgType = "custom";

          customBgCard.classList.add("selected");
          defaultBgCard.classList.remove("selected");
          if (confirmImageBtn) confirmImageBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const storyCardContainer = document.getElementById("storyCardContainer");
  const storyBody = document.getElementById("storyBody");

  if (confirmImageBtn && storyCardContainer) {
    confirmImageBtn.addEventListener("click", async () => {
      imagePickerModal.classList.remove("show");
      const chartColOptions = document.querySelectorAll(".chart-col-option");
      const selectedCharts = Array.from(chartColOptions)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);
      const activePeriodBtn = document.querySelector(".time-toggle-btn.active");
      const period = activePeriodBtn ? activePeriodBtn.dataset.period : "month";
      if (typeof periodCache === "undefined" || !periodCache[period]) {
        alert("Data not fully loaded yet. Please wait.");
        return;
      }
      const data = periodCache[period];
      const gradient = document.getElementById("storyCardGradient");
      if (gradient) {
        const c = selectedColor || "#bb86fc";
        gradient.style.background = `radial-gradient(circle at 100% 100%, ${c} 0%, transparent 55%)`;
        gradient.style.filter = "none";
        gradient.style.opacity = "0.25";
      }

      const separator = document.querySelector(".story-separator");
      if (separator) {
        separator.style.backgroundColor = selectedColor || "#bb86fc";
      }
      const customStoryBg = document.getElementById("customStoryBg");
      const userImg = document.getElementById("storyUserImg");

      if (selectedBgType === "custom" && customBgDataUrl) {
        customStoryBg.style.backgroundImage = `url(${customBgDataUrl})`;
        customStoryBg.style.display = "block";
      } else {
        customStoryBg.style.display = "none";
        if (data.artistCoverImage) {
          customStoryBg.style.backgroundImage = `url(${data.artistCoverImage})`;
          customStoryBg.style.display = "block";
        }
      }
      if (data.userInfo && data.userInfo.user) {
        userImg.src =
          data.userInfo.user.image.find((img) => img.size === "extralarge")?.["#text"] ||
          data.userInfo.user.image[0]?.["#text"];
        const storyTitleEl = document.getElementById("storyTitle");
        storyTitleEl.textContent = data.userInfo.user.name;
        storyTitleEl.style.color = selectedColor || "#bb86fc";
      }
      const date = new Date();
      let subtitleText = "";
      if (period === "week") {
        const dayOfWeek = date.getDay();
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
        const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diffToMonday);
        
        const startDay = startOfWeek.getDate().toString().padStart(2, '0');
        const endDay = date.getDate().toString().padStart(2, '0');
        const monthShort = date.toLocaleString("default", { month: "short" }).toLowerCase();
        subtitleText = `${startDay}-${endDay} ${monthShort}`;
      } else {
        subtitleText = date.toLocaleString("default", { month: "long" }).toUpperCase();
      }
      
      const storySubtitleEl = document.getElementById("storySubtitle");
      storySubtitleEl.textContent = subtitleText;
      storySubtitleEl.style.color = selectedColor || "#bb86fc";
      
      const storyReviewLabel = document.getElementById("storyReviewLabel");
      if (storyReviewLabel) {
        storyReviewLabel.textContent = period === "week" ? "Week Review" : "Month Review";
      }
      const minutes = Math.round(data.rawTracks.length * 3.5);
      const isSingle = selectedCharts.length === 1;
      const scrobblesValueEl = document.getElementById("storyScrobblesValue");
      const scrobblesLabelEl = document.getElementById("storyScrobblesLabel");
      const statGroupEl = scrobblesValueEl.parentElement;

      if (isSingle) {
        scrobblesValueEl.textContent = `${minutes.toLocaleString("en-US")} minutes`;
        scrobblesLabelEl.style.display = "none";
        statGroupEl.style.flexDirection = "row";
        scrobblesValueEl.style.fontSize = "4.5rem";
      } else {
        scrobblesValueEl.textContent = minutes.toLocaleString("en-US");
        scrobblesLabelEl.textContent = "Total Minutes";
        scrobblesLabelEl.style.display = "block";
        statGroupEl.style.flexDirection = "column";
        scrobblesValueEl.style.fontSize = "";
      }

      storyBody.innerHTML = "";

      const getTop5 = (list) => list.slice(0, 5);
      const fetchAssetImage = async (type, query) => {
        try {
          const res = await fetch(
            `https://bubblefm.snw-mint.workers.dev/assets?type=${type}&query=${encodeURIComponent(query)}`,
          );
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            return type === "artist"
              ? json.data[0].picture_medium || json.data[0].picture
              : json.data[0].cover_medium || json.data[0].cover;
          }
        } catch (e) {}
        return null;
      };

      for (let i = 0; i < selectedCharts.length; i++) {
        const chartType = selectedCharts[i];
        let items = [];
        let title = "";
        let searchType = "";

        if (chartType === "artists") {
          items = getTop5(data.artists);
          title = "Top Artists";
          searchType = "artist";
        } else if (chartType === "tracks") {
          items = getTop5(data.tracks);
          title = "Top Songs";
          searchType = "track";
        } else if (chartType === "albums") {
          items = getTop5(data.albums);
          title = "Top Albums";
          searchType = "album";
        }

        const colDiv = document.createElement("div");
        colDiv.className = "story-column" + (isSingle ? " single-col" : "");
        colDiv.innerHTML = `<h3 style="border-left-color: ${selectedColor || "#bb86fc"}">${title}</h3>`;

        const listDiv = document.createElement("div");
        listDiv.className = "story-list";

        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const rank = j + 1;
          const itemDiv = document.createElement("div");
          itemDiv.className = `story-item ${rank === 1 ? "top-1" : ""}`;

          let imgHtml = "";
          if (isSingle) {
            let q = chartType === "artists" ? item.name : `${item.name} ${item.artist?.name || ""}`;
            let t = chartType === "artists" ? "artist" : "album";
            const imgSrc = (await fetchAssetImage(t, q)) || "https://via.placeholder.com/150";
            imgHtml = `<img src="${imgSrc}" class="story-item-img" />`;
          }

          let metaHtml = "";
          if (chartType === "tracks" || chartType === "albums") {
            metaHtml = `<span class="story-meta">${item.artist.name}</span>`;
          } else {
            metaHtml = `<span class="story-meta">${item.playcount} streams</span>`;
          }

          itemDiv.innerHTML = `
            <span class="story-rank" style="color: ${selectedColor || "#bb86fc"}">${rank}</span>
            ${imgHtml}
            <div class="story-item-content">
              <span class="story-text">${item.name}</span>
              ${metaHtml}
            </div>
          `;
          listDiv.appendChild(itemDiv);
        }

        colDiv.appendChild(listDiv);
        storyBody.appendChild(colDiv);
      }
      storyCardContainer.style.opacity = "0";
      storyCardContainer.style.zIndex = "-999";
      confirmImageBtn.textContent = "Generating...";

      const generationModal = document.getElementById("generationModal");
      const stateLoading = document.getElementById("generationStateLoading");
      const stateComplete = document.getElementById("generationStateComplete");

      if (generationModal) {
        generationModal.style.display = "flex";
        stateLoading.style.display = "flex";
        stateComplete.style.display = "none";
      }

      setTimeout(() => {
        const cardElement = document.getElementById("storyCard");
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

            if (typeof umami !== 'undefined') {
              const activeTimeBtn = document.querySelector('.time-toggle-btn.active');
              umami.track('Card Generated', {
                type: window.location.pathname.includes('match') ? 'match' : 'single',
                period: activeTimeBtn ? activeTimeBtn.dataset.period : 'month',
                charts: selectedCharts.join(','),
                color: selectedColor || '#bb86fc',
                cover: selectedBgType || 'default'
              });
            }

            confirmImageBtn.textContent = "Next";
            confirmImageBtn.disabled = false;

            if (generationModal) {
              stateLoading.style.display = "none";
              stateComplete.style.display = "flex";
              setTimeout(() => {
                generationModal.style.display = "none";
              }, 3000);
            }
          })
          .catch((err) => {
            console.error("Error generating canvas", err);
            confirmImageBtn.textContent = "Error";
            if (generationModal) {
              generationModal.style.display = "none";
            }
          });
      }, 1000);
    });
  }
});
