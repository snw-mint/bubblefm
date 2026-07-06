/*
 * BubbleFM
 * Copyright (c) 2026 SnowMint
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M451.5-771.5Q440-783 440-800v-80q0-17 11.5-28.5T480-920t28.5 11.5T520-880v80q0 17-11.5 28.5T480-760t-28.5-11.5M678-678q-11-11-11-27.5t11-28.5l56-57q12-12 28.5-12t28.5 12q11 11 11 28t-11 28l-57 57q-11 11-28 11t-28-11m122 238q-17 0-28.5-11.5T760-480t11.5-28.5T800-520h80q17 0 28.5 11.5T920-480t-11.5 28.5T880-440zM451.5-51.5Q440-63 440-80v-80q0-17 11.5-28.5T480-200t28.5 11.5T520-160v80q0 17-11.5 28.5T480-40t-28.5-11.5M226-678l-57-56q-12-12-12-29t12-28q11-11 28-11t28 11l57 57q11 11 11 28t-11 28q-12 11-28 11t-28-11m508 509-56-57q-11-12-11-28.5t11-27.5 27.5-11 28.5 11l57 56q12 11 11.5 28T791-169q-12 12-29 12t-28-12M80-440q-17 0-28.5-11.5T40-480t11.5-28.5T80-520h80q17 0 28.5 11.5T200-480t-11.5 28.5T160-440zm89 271q-11-11-11-28t11-28l57-57q11-11 27.5-11t28.5 11q12 12 12 28.5T282-225l-56 56q-12 12-29 12t-28-12m141-141q-70-70-70-170t70-170 170-70 170 70 70 170-70 170-170 70-170-70"/></svg>`;
const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z"/></svg>`;

const lastfmBaseUrl = "https://bubblefm.snw-mint.workers.dev/data";
const assetsBaseUrl = "https://bubblefm.snw-mint.workers.dev/assets";

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

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "light" : "dark");
    });
  }
  const user1 = sessionStorage.getItem("lastfm_user1");
  const user2 = sessionStorage.getItem("lastfm_user2");

  if (!user1 || !user2) {
    window.location.href = "index.html";
    return;
  }

  try {
    const [info1Res, info2Res, artists1Res, artists2Res] = await Promise.all([
      fetch(`${lastfmBaseUrl}?method=user.getinfo&user=${user1}&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.getinfo&user=${user2}&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettopartists&user=${user1}&period=1month&limit=100&_t=${Date.now()}`),
      fetch(`${lastfmBaseUrl}?method=user.gettopartists&user=${user2}&period=1month&limit=100&_t=${Date.now()}`),
    ]);

    const info1 = await info1Res.json();
    const info2 = await info2Res.json();
    const artists1Data = await artists1Res.json();
    const artists2Data = await artists2Res.json();

    if (info1.user) {
      document.getElementById("userDisplayName1").textContent = info1.user.name;
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
    const unique1 = [];
    const unique2 = [];

    for (const a1 of list1) {
      const nameKey = a1.name.toLowerCase();
      if (map2.has(nameKey)) {
        common.push({
          name: a1.name,
          score: map1.get(nameKey).rank + map2.get(nameKey).rank,
          playcount: parseInt(a1.playcount) + parseInt(map2.get(nameKey).playcount),
        });
      } else {
        unique1.push(a1);
      }
    }

    for (const a2 of list2) {
      if (!map1.has(a2.name.toLowerCase())) {
        unique2.push(a2);
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

        if (i === 0) {
          const html = `
            <div class="chart-item top-1">
              <div class="top1-image skeleton skeleton-icon" id="${elementId}-imgSkeleton">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-300q75 0 127.5-52.5T660-480q0-75-52.5-127.5T480-660q-75 0-127.5 52.5T300-480q0 75 52.5 127.5T480-300Zm-28.5-151.5Q440-463 440-480t11.5-28.5Q463-520 480-520t28.5 11.5Q520-497 520-480t-11.5 28.5Q497-440 480-440t-28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
              </div>
              <img class="top1-image" id="${elementId}-img" alt="Top 1" style="display: none" />
              <div class="text-content">
                <span style="font-weight: bold;">${item.name}</span>
                <span style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.85);">${isCommon ? item.playcount + " plays together" : item.playcount + " scrobbles"}</span>
              </div>
            </div>
          `;
          container.insertAdjacentHTML("beforeend", html);
          try {
            const res = await fetch(`${assetsBaseUrl}?type=artist&query=${encodeURIComponent(item.name)}`);
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              top1Image = data.data[0];
              const imgEl = document.getElementById(`${elementId}-img`);
              imgEl.src = data.data[0].picture_medium || data.data[0].picture;
              imgEl.style.display = "block";
              document.getElementById(`${elementId}-imgSkeleton`).style.display = "none";
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          const html = `
            <div class="chart-item">
              <span style="font-weight: bold; margin-right: 15px; color: var(--color-primary)">#${i + 1}</span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${item.name}</span>
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
      unique1,
      `${user2} listens to all your top artists!`,
    );
    await renderList("listUser2Vibe", "msgUser2Vibe", unique2, `${user1} listens to all your top artists!`);
    const coverSource = commonImg || u1FallbackImg;
    if (coverSource) {
      const coverUrl = coverSource.picture_xl || coverSource.picture_big || coverSource.picture;
      document.getElementById("artistCover").src = coverUrl;
      document.getElementById("artistCover").style.display = "block";
      document.getElementById("coverContainer").classList.remove("skeleton", "skeleton-icon");
      document.getElementById("coverSkeletonIcon").style.display = "none";
    }

    const btnGerarRelatorio = document.getElementById("btnGerarRelatorio");
    const colorPickerModal = document.getElementById("colorPickerModal");
    const imagePickerModal = document.getElementById("imagePickerModal");
    const closeColorPicker = document.getElementById("closeColorPicker");
    const closeImagePicker = document.getElementById("closeImagePicker");
    const confirmColorBtn = document.getElementById("confirmColorBtn");
    const confirmImageBtn = document.getElementById("confirmImageBtn");

    let selectedCardColor = "#F44336";
    let selectedCardBg = "default";
    let customBgUrl = null;

    if (btnGerarRelatorio) {
      btnGerarRelatorio.addEventListener("click", () => {
        document.querySelectorAll(".color-option").forEach((btn) => btn.classList.remove("selected"));
        confirmColorBtn.disabled = true;
        colorPickerModal.style.display = "flex";
      });
    }

    if (closeColorPicker) {
      closeColorPicker.addEventListener("click", () => {
        colorPickerModal.style.display = "none";
      });
    }

    const colorOptions = document.querySelectorAll(".color-option:not(.custom-color-btn)");
    colorOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".color-option").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedCardColor = btn.getAttribute("data-color");
        confirmColorBtn.disabled = false;
      });
    });

    const customColorBtn = document.getElementById("customColorBtn");
    const customColorPicker = document.getElementById("customColorPicker");
    if (customColorBtn && customColorPicker) {
      customColorBtn.addEventListener("click", () => {
        customColorPicker.click();
      });
      customColorPicker.addEventListener("input", (e) => {
        document.querySelectorAll(".color-option").forEach((b) => b.classList.remove("selected"));
        customColorBtn.classList.add("selected");
        customColorBtn.style.backgroundColor = e.target.value;
        selectedCardColor = e.target.value;
        confirmColorBtn.disabled = false;
      });
    }

    if (confirmColorBtn) {
      confirmColorBtn.addEventListener("click", () => {
        colorPickerModal.style.display = "none";
        document.querySelectorAll(".card-option").forEach((opt) => opt.classList.remove("selected"));
        confirmImageBtn.disabled = true;
        imagePickerModal.style.display = "flex";
      });
    }

    if (closeImagePicker) {
      closeImagePicker.addEventListener("click", () => {
        imagePickerModal.style.display = "none";
      });
    }

    const cardOptions = document.querySelectorAll(".card-option");
    cardOptions.forEach((opt) => {
      opt.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "input") return;

        document.querySelectorAll(".card-option").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
        selectedCardBg = opt.getAttribute("data-bg");

        if (selectedCardBg === "custom") {
          document.getElementById("customBgInput").click();
        } else {
          confirmImageBtn.disabled = false;
        }
      });
    });

    const customBgInput = document.getElementById("customBgInput");
    if (customBgInput) {
      customBgInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = function (event) {
            customBgUrl = event.target.result;
            confirmImageBtn.disabled = false;
          };
          reader.readAsDataURL(e.target.files[0]);
        } else {
          document.querySelectorAll(".card-option").forEach((o) => o.classList.remove("selected"));
          confirmImageBtn.disabled = true;
        }
      });
    }

    if (confirmImageBtn) {
      confirmImageBtn.addEventListener("click", async () => {
        imagePickerModal.style.display = "none";

        const storyCardContainer = document.getElementById("storyCardContainer");
        const storyBody = document.getElementById("storyBody");
        const gradient = document.getElementById("storyCardGradient");
        if (gradient) {
          gradient.style.background = `radial-gradient(circle at 100% 100%, ${selectedCardColor} 0%, transparent 55%)`;
          gradient.style.filter = "none";
          gradient.style.opacity = "0.25";
        }

        const separator = document.querySelector(".story-separator");
        if (separator) {
          separator.style.backgroundColor = selectedCardColor;
        }

        const customStoryBg = document.getElementById("customStoryBg");
        if (selectedCardBg === "custom" && customBgUrl) {
          customStoryBg.style.backgroundImage = `url(${customBgUrl})`;
          customStoryBg.style.display = "block";
        } else {
          customStoryBg.style.display = "none";
          if (coverSource) {
            const coverUrl = coverSource.picture_xl || coverSource.picture_big || coverSource.picture;
            customStoryBg.style.backgroundImage = `url(${coverUrl})`;
            customStoryBg.style.display = "block";
          }
        }

        const img1 = document.getElementById("storyUserImg1");
        const img2 = document.getElementById("storyUserImg2");
        if (info1.user?.image) {
          img1.src =
            info1.user.image.find((img) => img.size === "extralarge")?.["#text"] ||
            info1.user.image[0]?.["#text"] ||
            "/assets/default_avatar.png";
        } else {
          img1.src = "/assets/default_avatar.png";
        }
        if (info2.user?.image) {
          img2.src =
            info2.user.image.find((img) => img.size === "extralarge")?.["#text"] ||
            info2.user.image[0]?.["#text"] ||
            "/assets/default_avatar.png";
        } else {
          img2.src = "/assets/default_avatar.png";
        }

        document.getElementById("storyMatchValue").textContent = `${matchPercentage}%`;

        storyBody.innerHTML = "";

        const renderChart = (items, title) => {
          const top5 = items.slice(0, 5);
          const colDiv = document.createElement("div");
          colDiv.className = "story-column";
          colDiv.innerHTML = `<h3 style="border-left-color: ${selectedCardColor}">${title}</h3>`;
          const listDiv = document.createElement("div");
          listDiv.className = "story-list";

          for (let j = 0; j < top5.length; j++) {
            const item = top5[j];
            const rank = j + 1;
            const itemDiv = document.createElement("div");
            itemDiv.className = `story-item ${rank === 1 ? "top-1" : ""}`;

            itemDiv.innerHTML = `
              <span class="story-rank" style="color: ${selectedCardColor}">${rank}</span>
              <div class="story-item-content">
                <span class="story-text">${item.name}</span>
                <span class="story-meta">${item.playcount} scrobbles</span>
              </div>
            `;
            listDiv.appendChild(itemDiv);
          }
          colDiv.appendChild(listDiv);
          storyBody.appendChild(colDiv);
        };

        renderChart(unique1, info1.user?.name || user1);
        renderChart(unique2, info2.user?.name || user2);

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
              link.download = `bubblefm_match_${user1}_${user2}.png`;
              link.href = imgData;
              link.click();

              storyCardContainer.style.opacity = "";
              storyCardContainer.style.zIndex = "";
              confirmImageBtn.textContent = "Next";

              if (generationModal) {
                stateLoading.style.display = "none";
                stateComplete.style.display = "flex";
                setTimeout(() => {
                  generationModal.style.display = "none";
                }, 3000);
              }
            })
            .catch((err) => {
              console.error("Error generating canvas:", err);
              confirmImageBtn.textContent = "Next";
              if (generationModal) {
                generationModal.style.display = "none";
              }
            });
        }, 500);
      });
    }

    window.addEventListener("click", (event) => {
      if (event.target === colorPickerModal) colorPickerModal.style.display = "none";
      if (event.target === imagePickerModal) imagePickerModal.style.display = "none";
    });
  } catch (error) {
    console.error("Error fetching match data:", error);
  }
});
