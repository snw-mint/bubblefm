const SUNSET_DISMISS_KEY = "bubblefm_sunset_notice_dismissed_v2";
const LASTFM_ANNOUNCEMENT_URL =
  "https://support.last.fm/t/api-keys-will-require-pro-from-1st-december/121030";
const LISTENDECK_URL = "https://github.com/snw-mint/listendeck";

function trackEvent(name, data) {
  if (typeof umami !== "undefined") {
    umami.track(name, data);
  }
}

function isDismissed() {
  try {
    return localStorage.getItem(SUNSET_DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(SUNSET_DISMISS_KEY, "true");
  } catch {}
}

function syncInfobarHeight(infobar) {
  const height = infobar ? infobar.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty("--sunset-infobar-height", `${Math.ceil(height)}px`);
  document.body.classList.toggle("has-sunset-infobar", height > 0);
}

function createInfobar() {
  let infobar = document.getElementById("sunsetInfobar");
  if (infobar) return infobar;

  infobar = document.createElement("div");
  infobar.id = "sunsetInfobar";
  infobar.className = "sunset-infobar";
  infobar.setAttribute("role", "region");
  infobar.setAttribute("aria-label", "Service shutdown notice");
  infobar.innerHTML = `
    <span class="sunset-infobar-icon" aria-hidden="true">
      <animate-icons name="triangle-alert" size="16"></animate-icons>
    </span>
    <span class="sunset-infobar-text">
      BubbleFM will shut down and be archived on Dec 1 due to Last.fm's new Pro API requirement.
    </span>
    <div class="sunset-infobar-actions">
      <a href="${LASTFM_ANNOUNCEMENT_URL}" target="_blank" rel="noopener noreferrer" id="sunsetInfobarLink" class="sunset-infobar-link">
        <span>Last.fm announcement</span>
        <animate-icons name="external-link" size="13"></animate-icons>
      </a>
      <button type="button" id="sunsetInfobarDetailsBtn" class="sunset-infobar-btn">Details</button>
    </div>
  `;

  document.body.insertAdjacentElement("afterbegin", infobar);
  syncInfobarHeight(infobar);

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => syncInfobarHeight(infobar));
    observer.observe(infobar);
  }
  window.addEventListener("resize", () => syncInfobarHeight(infobar));

  return infobar;
}

function createModal() {
  let modal = document.getElementById("sunsetModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "sunsetModal";
  modal.className = "modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "sunsetModalTitle");
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-content settings-sheet sunset-modal-sheet">
      <div class="sheet-header sunset-modal-header">
        <div>
          <span class="sunset-badge">
            <span class="sunset-badge-icon" aria-hidden="true">
              <animate-icons name="triangle-alert" size="22"></animate-icons>
            </span>
            <span class="sunset-badge-text">
              <span class="sunset-badge-title">Notice</span>
              <span class="sunset-badge-subtitle">Dec 1st Shutdown</span>
            </span>
          </span>
          <h2 id="sunsetModalTitle">BubbleFM is <span class="highlight-serif">shutting down</span></h2>
        </div>
        <button type="button" class="icon-button" id="sunsetModalCloseBtn" aria-label="Close">
          <animate-icons name="x" size="24"></animate-icons>
        </button>
      </div>

      <div class="sunset-modal-body">
        <p>
          BubbleFM is a completely free and open-source project with no financial return. Last.fm announced that starting <strong>December 1</strong>, holding a Last.fm API key will require a paid <strong>Last.fm Pro</strong> subscription, and existing keys without it will stop working.
        </p>

        <div class="sunset-callout">
          <span class="sunset-callout-title">Official announcement from the Last.fm team:</span>
          <a href="${LASTFM_ANNOUNCEMENT_URL}" target="_blank" rel="noopener noreferrer" id="sunsetModalAnnouncementLink" class="sunset-inline-link">
            <span>support.last.fm — API keys will require Pro from 1st December</span>
            <animate-icons name="external-link" size="14"></animate-icons>
          </a>
        </div>

        <p>
          Since paying for a Last.fm Pro subscription solely to keep a free tool online isn't sustainable, <strong>BubbleFM will be shut down on December 1</strong> and archived with the source code preserved on GitHub. Once shut down, it will still work locally under a <strong>BYOK (Bring Your Own Key)</strong> model.
        </p>

        <div class="sunset-callout">
          <span class="sunset-callout-title">Migrating for free to ListenDeck</span>
          <p>
            This tool is being migrated for free to <strong>ListenDeck</strong>, powered by <strong>ListenBrainz</strong> instead of Last.fm.
          </p>
          <a href="${LISTENDECK_URL}" target="_blank" rel="noopener noreferrer" id="sunsetModalListenDeckLink" class="sunset-inline-link">
            <span>github.com/snw-mint/listendeck</span>
            <animate-icons name="external-link" size="14"></animate-icons>
          </a>
        </div>
      </div>

      <div class="sunset-modal-actions">
        <button type="button" id="sunsetModalAckBtn" class="btn-primary full-width">Understood</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

function initSunsetNotice() {
  if (document.body?.dataset.sunsetNoticeReady === "true") return;
  if (document.body) {
    document.body.dataset.sunsetNoticeReady = "true";
  }

  createInfobar();
  const modal = createModal();

  const infobarAlertIcon = document.querySelector("#sunsetInfobar .sunset-infobar-icon animate-icons");
  const modalAlertIcon = modal.querySelector(".sunset-badge-icon animate-icons");
  let modalAlertTimer = null;

  const triggerIcon = (icon) => {
    if (!document.hidden && icon && typeof icon.startAnimation === "function") {
      icon.startAnimation();
    }
  };

  if (infobarAlertIcon) {
    setTimeout(() => triggerIcon(infobarAlertIcon), 200);
    setInterval(() => triggerIcon(infobarAlertIcon), 2800);
  }

  const startModalAlertLoop = () => {
    if (modalAlertTimer) clearInterval(modalAlertTimer);
    setTimeout(() => triggerIcon(modalAlertIcon), 150);
    modalAlertTimer = setInterval(() => {
      if (modal.classList.contains("show")) {
        triggerIcon(modalAlertIcon);
      }
    }, 2400);
  };

  const stopModalAlertLoop = () => {
    if (modalAlertTimer) {
      clearInterval(modalAlertTimer);
      modalAlertTimer = null;
    }
  };

  const openModal = (source = "auto") => {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    startModalAlertLoop();
    trackEvent("modal_opened", { modal: "sunset_notice", source });
  };

  const closeModal = (method = "close") => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    stopModalAlertLoop();
    markDismissed();
    trackEvent("sunset_notice_dismissed", { method });
  };

  const closeBtn = document.getElementById("sunsetModalCloseBtn");
  const ackBtn = document.getElementById("sunsetModalAckBtn");
  const detailsBtn = document.getElementById("sunsetInfobarDetailsBtn");
  const infobarLink = document.getElementById("sunsetInfobarLink");
  const modalAnnouncementLink = document.getElementById("sunsetModalAnnouncementLink");
  const modalListenDeckLink = document.getElementById("sunsetModalListenDeckLink");

  if (closeBtn) closeBtn.addEventListener("click", () => closeModal("close_button"));
  if (ackBtn) ackBtn.addEventListener("click", () => closeModal("understood"));
  if (detailsBtn) detailsBtn.addEventListener("click", () => openModal("infobar"));
  if (infobarLink) {
    infobarLink.addEventListener("click", () => {
      trackEvent("Outbound Click", { destination: "lastfm_announcement", source: "infobar" });
    });
  }
  if (modalAnnouncementLink) {
    modalAnnouncementLink.addEventListener("click", () => {
      trackEvent("Outbound Click", { destination: "lastfm_announcement", source: "modal" });
    });
  }
  if (modalListenDeckLink) {
    modalListenDeckLink.addEventListener("click", () => {
      trackEvent("Outbound Click", { destination: "listendeck", source: "modal" });
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal("backdrop");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) {
      closeModal("escape");
    }
  });

  if (!isDismissed()) {
    requestAnimationFrame(() => openModal("auto"));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSunsetNotice);
} else {
  initSunsetNotice();
}
