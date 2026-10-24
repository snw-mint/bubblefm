import * as htmlToImage from 'html-to-image';
import '/js/icons.js';

const SUN_ICON = `<animate-icons name="sun" size="24"></animate-icons>`;
const MOON_ICON = `<animate-icons name="moon" size="24"></animate-icons>`;

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
});
