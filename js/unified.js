const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-280q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`;
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
}
