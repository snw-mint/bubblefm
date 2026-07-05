const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M338.5-338.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM80-440q-17 0-28.5-11.5T40-480q0-17 11.5-28.5T80-520h80q17 0 28.5 11.5T200-480q0 17-11.5 28.5T160-440H80Zm720 0q-17 0-28.5-11.5T760-480q0-17 11.5-28.5T800-520h80q17 0 28.5 11.5T920-480q0 17-11.5 28.5T880-440h-80ZM451.5-771.5Q440-783 440-800v-80q0-17 11.5-28.5T480-920q17 0 28.5 11.5T520-880v80q0 17-11.5 28.5T480-760q-17 0-28.5-11.5Zm0 720Q440-63 440-80v-80q0-17 11.5-28.5T480-200q17 0 28.5 11.5T520-160v80q0 17-11.5 28.5T480-40q-17 0-28.5-11.5ZM226-678l-43-42q-12-11-11.5-28t11.5-29q12-12 29-12t28 12l42 43q11 12 11 28t-11 28q-11 12-27.5 11.5T226-678Zm494 495-42-43q-11-12-11-28.5t11-27.5q11-12 27.5-11.5T734-282l43 42q12 11 11.5 28T777-183q-12 12-29 12t-28-12Zm-42-495q-12-11-11.5-27.5T678-734l42-43q11-12 28-11.5t29 11.5q12 12 12 29t-12 28l-43 42q-12 11-28 11t-28-11ZM183-183q-12-12-12-29t12-28l43-42q12-11 28.5-11t27.5 11q12 11 11.5 27.5T282-226l-42 43q-11 12-28 11.5T183-183Z"/></svg>`;
const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-120q-151 0-255.5-104.5T120-480q0-138 90-239.5T440-838q13-2 23 3.5t16 14.5q6 9 6.5 21t-7.5 23q-17 26-25.5 55t-8.5 61q0 90 63 153t153 63q31 0 61.5-9t54.5-25q11-7 22.5-6.5T819-479q10 5 15.5 15t3.5 24q-14 138-117.5 229T480-120Z"/></svg>`;
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

  // Handle form submission on index.html
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

  // Handle API fetching on result.html
  if (window.location.pathname.endsWith("result.html") || window.location.pathname.includes("result.html")) {
    const user = sessionStorage.getItem("lastfm_user");
    if (!user) {
      window.location.href = "index.html";
    } else {
      fetchLastfmAndDeezerData(user);
    }
  }
});

async function fetchLastfmAndDeezerData(username) {
  try {
    console.log("Fetching data for:", username);
    const baseUrl = "https://main.snw-mint.workers.dev/";

    // Fetch Last.fm Data
    const [userInfoRes, topArtistRes, topAlbumRes] = await Promise.all([
      fetch(`${baseUrl}?method=user.getinfo&user=${username}&_t=${Date.now()}`),
      fetch(`${baseUrl}?method=user.gettopartists&user=${username}&limit=1&period=overall&_t=${Date.now()}`),
      fetch(`${baseUrl}?method=user.gettopalbums&user=${username}&limit=1&period=overall&_t=${Date.now()}`)
    ]);

    const userInfo = await userInfoRes.json();
    const topArtistData = await topArtistRes.json();
    const topAlbumData = await topAlbumRes.json();

    const topArtistName = topArtistData?.topartists?.artist?.[0]?.name;
    const topAlbumName = topAlbumData?.topalbums?.album?.[0]?.name;
    const topAlbumArtist = topAlbumData?.topalbums?.album?.[0]?.artist?.name;

    let artistImage = null;
    let albumImage = null;

    // Fetch Deezer Data
    if (topArtistName) {
      const deezerArtistRes = await fetch(`/api/deezer/search?q=artist:"${encodeURIComponent(topArtistName)}"`);
      const deezerArtistData = await deezerArtistRes.json();
      if (deezerArtistData.data && deezerArtistData.data.length > 0) {
        artistImage = deezerArtistData.data[0].artist.picture_xl || deezerArtistData.data[0].artist.picture_big || deezerArtistData.data[0].artist.picture;
      }
    }

    if (topAlbumName && topAlbumArtist) {
      const deezerAlbumRes = await fetch(`/api/deezer/search?q=artist:"${encodeURIComponent(topAlbumArtist)}" album:"${encodeURIComponent(topAlbumName)}"`);
      const deezerAlbumData = await deezerAlbumRes.json();
      if (deezerAlbumData.data && deezerAlbumData.data.length > 0) {
        albumImage = deezerAlbumData.data[0].album.cover_xl || deezerAlbumData.data[0].album.cover_big || deezerAlbumData.data[0].album.cover;
      }
    }

    console.log("=== API RESULTS ===");
    console.log("Dados do Last.fm:", {
      userInfo,
      topArtist: topArtistData?.topartists?.artist?.[0],
      topAlbum: topAlbumData?.topalbums?.album?.[0]
    });
    console.log("Foto do artista mais ouvido:", artistImage);
    console.log("Foto do album mais ouvido:", albumImage);
    console.log("===================");

    // Update UI Header
    const userAvatarEl = document.getElementById("userAvatar");
    const userDisplayNameEl = document.getElementById("userDisplayName");
    const artistCoverEl = document.getElementById("artistCover");

    if (userDisplayNameEl) {
      userDisplayNameEl.textContent = userInfo?.user?.realname || userInfo?.user?.name || username;
    }

    if (userAvatarEl) {
      const images = userInfo?.user?.image;
      const avatarUrl = Array.isArray(images)
        ? images.find(img => img.size === "extralarge")?.["#text"] ||
          images.find(img => img.size === "large")?.["#text"] ||
          images[images.length - 1]?.["#text"]
        : null;
      if (avatarUrl && avatarUrl.trim() !== "") {
        userAvatarEl.src = avatarUrl;
      }
    }

    if (artistCoverEl && artistImage) {
      artistCoverEl.src = artistImage;
    }

  } catch (error) {
    console.error("Error fetching API data:", error);
  }
}

