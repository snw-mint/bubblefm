import * as htmlToImage from "html-to-image";
import "/js/icons.js";

const SUN_ICON = `<animate-icons name="sun" size="24"></animate-icons>`;
const MOON_ICON = `<animate-icons name="moon" size="24"></animate-icons>`;
const CACHE_KEY = "bubblefm_cards_cache";

let currentItem = null;
let currentLayout = "card";
let currentMode = "static";
let currentAnimatedUrl = null;
let isCheckingAnimated = false;
let customColor = null;
let currentService = "none";
let extractedDominant = { hex: "#2b2f3a", darkerHex: "#171a21" };
let tooltipTimer = null;

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

function getHighQualityCover(url) {
  if (!url) return "";
  let hq = url;
  if (hq.includes("dzcdn.net")) {
    hq = hq.replace(/\b(56x56|120x120|250x250|500x500)\b/g, "1000x1000");
  } else if (hq.includes("mzstatic.com")) {
    hq = hq.replace(/\b\d+x\d+bb\b/g, "1000x1000bb");
  } else if (hq.includes("i.scdn.co")) {
    hq = hq.replace(/ab67616d0000(1e02|4851)/g, "ab67616d0000b273");
  }
  return hq;
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function preloadVideo(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => {
      video.onloadeddata = null;
      video.onerror = null;
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);

    video.onloadeddata = () => {
      clearTimeout(timer);
      cleanup();
      resolve(video);
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    };

    video.src = src;
    video.load();
  });
}

async function resolveM3u8ToMp4(masterUrl) {
  if (!masterUrl) return null;
  try {
    const res = await fetch(masterUrl);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const variants = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
        const info = lines[i];
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.startsWith("#")) {
          const codecMatch = info.match(/CODECS="([^"]+)"/i);
          const resMatch = info.match(/RESOLUTION=(\d+)x(\d+)/i);
          const bwMatch = info.match(/BANDWIDTH=(\d+)/i);
          const codecs = codecMatch ? codecMatch[1] : "";
          const width = resMatch ? parseInt(resMatch[1], 10) : 0;
          const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
          const url = new URL(nextLine, masterUrl).href;
          variants.push({ codecs, width, bandwidth, url });
        }
      }
    }

    if (variants.length === 0) return null;

    const avcVariants = variants.filter((v) => v.codecs.toLowerCase().includes("avc1"));
    const pool = avcVariants.length > 0 ? avcVariants : variants;
    const capped = pool.filter((v) => v.width > 0 && v.width <= 1080);
    const candidates = (capped.length > 0 ? capped : pool).sort((a, b) => b.width - a.width || b.bandwidth - a.bandwidth);
    const chosen = candidates[0];
    if (!chosen) return null;

    const subRes = await fetch(chosen.url);
    if (!subRes.ok) {
      return chosen.url.replace(/\.m3u8(\?.*)?$/i, "-.mp4");
    }
    const subText = await subRes.text();
    const mapMatch = subText.match(/#EXT-X-MAP:URI="([^"]+)"/i);
    if (mapMatch && mapMatch[1]) {
      return new URL(mapMatch[1], chosen.url).href;
    }

    const mp4Line = subText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#") && l.includes(".mp4"));
    if (mp4Line) {
      return new URL(mp4Line, chosen.url).href;
    }

    return chosen.url.replace(/\.m3u8(\?.*)?$/i, "-.mp4");
  } catch {
    return null;
  }
}

async function fetchAnimatedArtwork(item) {
  if (!item || !item.artist || !item.title) return null;

  const queries = [];
  if (item.type === "album") {
    queries.push({ artist: item.artist, album: item.title });
  } else {
    if (item.album) {
      queries.push({ artist: item.artist, album: item.album, title: item.title });
      queries.push({ artist: item.artist, album: item.album });
    }
    queries.push({ artist: item.artist, album: item.title, title: item.title });
  }

  for (const q of queries) {
    try {
      const params = new URLSearchParams();
      params.set("artist", q.artist);
      params.set("album", q.album);
      if (q.title) params.set("title", q.title);

      const res = await fetch(`https://artwork.m8tec.top/api/v1/artwork/search?${params.toString()}`);
      if (!res.ok) continue;
      const data = await res.json();
      const m3u8 = data?.url || data?.url_tall;
      if (m3u8) {
        const mp4Url = await resolveM3u8ToMp4(m3u8);
        if (mp4Url) {
          const verified = await preloadVideo(mp4Url);
          if (verified) return mp4Url;
        }
      }
    } catch { }
  }

  return null;
}

function fetchDeezerJsonp(type, query) {
  return new Promise((resolve) => {
    const callbackName = "deezer_cards_cb_" + Math.random().toString(36).substring(2);
    const script = document.createElement("script");

    const timer = setTimeout(() => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(null);
    }, 3500);

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

async function fetchItunesResults(query, entity = "song") {
  try {
    const clean = sanitizeQuery(query);
    if (!clean) return [];
    const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined;
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=${entity}&limit=5`,
      { signal }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.results || []).map((item) => {
      const isAlbum = entity === "album";
      return {
        type: isAlbum ? "album" : "track",
        id: isAlbum ? item.collectionId : item.trackId,
        title: isAlbum ? (item.collectionName || "") : (item.trackName || ""),
        artist: item.artistName || "",
        cover: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "400x400bb") : "",
        coverHq: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "1000x1000bb") : "",
        album: item.collectionName || "",
      };
    });
  } catch {
    return [];
  }
}

async function searchTracksAndAlbums(rawQuery) {
  if (!rawQuery) return [];
  const sanitized = sanitizeQuery(rawQuery);
  if (!sanitized) return [];

  const [tracksRes, albumsRes] = await Promise.all([
    fetchDeezerJsonp("track", sanitized),
    fetchDeezerJsonp("album", sanitized),
  ]);

  let tracks = (tracksRes?.data || []).map((t) => ({
    type: "track",
    id: `track_${t.id}`,
    title: t.title || t.title_short || "",
    artist: t.artist?.name || "",
    cover: t.album?.cover_medium || t.album?.cover_big || t.album?.cover || "",
    coverHq: t.album?.cover_xl || (t.album?.cover_big ? t.album.cover_big.replace("500x500", "1000x1000") : "") || t.album?.cover_medium || "",
    album: t.album?.title || "",
  }));

  let albums = (albumsRes?.data || []).map((a) => ({
    type: "album",
    id: `album_${a.id}`,
    title: a.title || "",
    artist: a.artist?.name || "",
    cover: a.cover_medium || a.cover_big || a.cover || "",
    coverHq: a.cover_xl || (a.cover_big ? a.cover_big.replace("500x500", "1000x1000") : "") || a.cover_medium || "",
    album: a.title || "",
  }));

  if (tracks.length === 0 && albums.length === 0) {
    const [itunesSongs, itunesAlbums] = await Promise.all([
      fetchItunesResults(rawQuery, "song"),
      fetchItunesResults(rawQuery, "album"),
    ]);
    tracks = itunesSongs;
    albums = itunesAlbums;
  }

  const combined = [];
  const maxLen = Math.max(tracks.length, albums.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < tracks.length) combined.push(tracks[i]);
    if (i < albums.length) combined.push(albums[i]);
  }

  return combined.slice(0, 10);
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  return null;
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function darkenHex(hex, amount = 0.4) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

function clampHexBrightness(hexColor, maxB = 138) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor;
  const b = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  if (b > maxB) {
    const factor = maxB / b;
    return rgbToHex(
      Math.round(rgb.r * factor),
      Math.round(rgb.g * factor),
      Math.round(rgb.b * factor)
    );
  }
  return hexColor;
}

function extractDominantColor(imgSrc) {
  return new Promise((resolve) => {
    const fallback = { hex: "#2b2f3a", darkerHex: "#171a21" };
    if (!imgSrc) return resolve(fallback);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        const buckets = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 245 || brightness < 15) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;

          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          buckets[key] = (buckets[key] || 0) + (1 + sat * 2);
          totalR += r;
          totalG += g;
          totalB += b;
          count++;
        }

        let bestKey = null;
        let maxWeight = 0;
        for (const [k, w] of Object.entries(buckets)) {
          if (w > maxWeight) {
            maxWeight = w;
            bestKey = k;
          }
        }

        let r = 43, g = 47, b = 58;
        if (bestKey) {
          [r, g, b] = bestKey.split(",").map(Number);
        } else if (count > 0) {
          r = Math.round(totalR / count);
          g = Math.round(totalG / count);
          b = Math.round(totalB / count);
        }

        const maxBrightness = 138;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness > maxBrightness) {
          const factor = maxBrightness / brightness;
          r = Math.round(r * factor);
          g = Math.round(g * factor);
          b = Math.round(b * factor);
        }

        const hex = rgbToHex(r, g, b);
        const darkerHex = darkenHex(hex, 0.4);
        resolve({ hex, darkerHex });
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = imgSrc;
  });
}

function getServiceLogoSvg(service) {
  switch (service) {
    case "applemusic":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50" overflow="visible" style="fill:currentColor; overflow:visible;"><path d="M83.57 48.49V15.95h-.24L70.31 48.49h-5.06L52.23 15.95h-.24v32.54h-6.03V4.37h7.72l13.98 35.2h.24l13.98-35.2h7.96v44.12zm40.25 0h-6.27v-5.55h-.24c-1.68 3.86-5.06 6.03-9.88 6.03-6.99 0-11.09-4.58-11.09-12.05V16.19h6.51v19.52c0 4.82 2.41 7.48 6.75 7.48 4.82 0 7.47-3.38 7.47-8.44V16.19h6.51zm17.84-32.79c7.47 0 12.05 4.1 12.29 10.13h-6.02c-.48-3.14-2.65-5.07-6.27-5.07s-6.03 1.69-6.03 4.34c0 1.93 1.45 3.38 4.82 4.1l5.07 1.21c6.51 1.44 8.92 4.1 8.92 8.68 0 5.78-5.31 9.88-12.78 9.88-7.96 0-12.78-3.86-13.26-10.13h6.51c.48 3.38 2.89 5.07 6.75 5.07s6.27-1.69 6.27-4.34c0-2.17-1.21-3.38-4.58-4.1l-5.07-1.21c-6.02-1.44-8.91-4.33-8.91-9.16 0-5.54 4.82-9.4 12.29-9.4m17.6-7.95c0-2.17 1.68-3.86 3.85-3.86s3.86 1.69 3.86 3.86-1.69 3.85-3.86 3.85-3.85-1.68-3.85-3.85m.48 8.43h6.51v32.31h-6.51zm33.99 11.09c-.72-3.38-3.13-6.27-7.47-6.27-5.07 0-8.44 4.34-8.44 11.09 0 6.99 3.37 11.09 8.44 11.09 4.09 0 6.5-2.17 7.47-6.03H200c-.73 6.75-6.03 11.57-13.74 11.57-9.16 0-14.95-6.27-14.95-16.63 0-10.13 5.79-16.64 14.95-16.64 8.19 0 13.01 5.31 13.74 11.57zM25.95 8.71c-1.69 1.93-4.34 3.62-6.99 3.38-.48-2.89.96-5.79 2.41-7.48C23.06 2.45 25.95 1 28.36 1c.24 2.65-.72 5.54-2.41 7.71m2.41 3.86c1.45 0 5.78.48 8.68 4.82-.24.24-5.07 3.13-5.07 9.16 0 7.23 6.27 9.64 6.27 9.64 0 .24-.96 3.38-3.13 6.75-1.93 2.9-4.1 5.79-7.23 5.79-3.14 0-4.1-1.93-7.72-1.93-3.61 0-4.82 1.93-7.71 1.93-3.13 0-5.55-3.13-7.47-6.03-4.1-6.02-7.24-16.87-2.9-24.1 1.93-3.62 5.79-6.03 9.65-6.03 3.13 0 6.02 2.17 7.71 2.17s5.06-2.41 8.92-2.17"/></svg>`;
    case "spotify":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 162 50" width="162" height="50" overflow="visible" style="fill:currentColor; overflow:visible;"><path d="M25.54 0c-13.81 0-25 11.19-25 25s11.19 25 25 25 25-11.19 25-25-11.19-25-25-25M37 36.06q-.16.26-.41.44-.25.19-.55.26t-.61.02q-.31-.04-.57-.21c-5.87-3.58-13.26-4.39-21.96-2.41q-.3.07-.61.02-.3-.05-.57-.22-.26-.16-.44-.41-.18-.26-.25-.56t-.02-.61q.06-.3.22-.56.17-.27.42-.45.25-.17.55-.24c9.53-2.18 17.7-1.24 24.29 2.78q.26.17.44.42.19.25.26.55t.02.61q-.05.3-.21.57m3.06-6.81c-.56.92-1.76 1.21-2.68.64-6.72-4.13-16.96-5.32-24.91-2.91q-.37.11-.76.07-.38-.04-.73-.22-.34-.18-.58-.48-.25-.3-.36-.67t-.08-.76q.04-.38.22-.72.19-.34.49-.59t.67-.36c9.08-2.76 20.36-1.42 28.08 3.32.92.57 1.21 1.77.64 2.68m.27-7.09c-8.06-4.78-21.36-5.22-29.05-2.89-1.23.38-2.54-.32-2.91-1.56q-.14-.44-.09-.91.04-.46.26-.87t.58-.7q.36-.3.8-.43c8.84-2.69 23.52-2.17 32.79 3.34q.4.24.68.61t.4.82q.11.45.04.91-.06.46-.3.86a2.33 2.33 0 0 1-3.2.82m28.23.92c-4.32-1.03-5.09-1.75-5.09-3.27 0-1.43 1.35-2.4 3.36-2.4 1.95 0 3.87.73 5.9 2.24q.09.07.21.05.03 0 .06-.01.02-.01.05-.02l.04-.04.04-.04 2.11-2.97q.03-.05.04-.1t.01-.11q-.01-.05-.04-.1-.03-.04-.07-.08c-2.41-1.93-5.12-2.87-8.29-2.87-4.66 0-7.91 2.8-7.91 6.8 0 4.29 2.8 5.81 7.66 6.98 4.13.96 4.83 1.75 4.83 3.18 0 1.58-1.41 2.56-3.68 2.56-2.52 0-4.58-.85-6.88-2.84q-.02-.02-.04-.03-.03-.02-.05-.02l-.06-.02h-.05q-.03 0-.06.01t-.05.02q-.03.01-.05.03l-.04.04-2.36 2.81q-.04.04-.05.1-.02.05-.02.1.01.06.03.11t.07.09c2.67 2.38 5.96 3.64 9.51 3.64 5.02 0 8.27-2.74 8.27-6.99.01-3.58-2.14-5.57-7.4-6.85m18.77-4.25c-2.18 0-3.96.85-5.44 2.61v-1.98a.28.28 0 0 0-.28-.28h-3.86q-.06 0-.11.02t-.09.06-.06.1q-.02.05-.02.1v21.98c0 .15.12.28.28.28h3.86q.06 0 .11-.02t.09-.06.06-.1q.02-.05.02-.1V34.5c1.48 1.65 3.26 2.46 5.44 2.46 4.05 0 8.14-3.11 8.14-9.07.01-5.95-4.09-9.06-8.14-9.06m3.65 9.06c0 3.03-1.87 5.15-4.55 5.15-2.64 0-4.63-2.21-4.63-5.15 0-2.93 1.99-5.14 4.63-5.14 2.63 0 4.55 2.16 4.55 5.14m14.99-9.06c-5.21 0-9.3 4.01-9.3 9.13 0 5.07 4.06 9.03 9.23 9.03 5.23 0 9.32-3.99 9.32-9.1 0-5.08-4.06-9.06-9.25-9.06m0 14.24c-2.78 0-4.86-2.23-4.86-5.18 0-2.96 2.01-5.11 4.79-5.11 2.79 0 4.89 2.22 4.89 5.18s-2.03 5.11-4.82 5.11m20.38-13.89h-4.26v-4.35c0-.16-.12-.28-.28-.28h-3.86q-.06 0-.11.02t-.09.06-.07.09q-.02.05-.02.11v4.35h-1.85q-.06 0-.11.02t-.09.06-.06.09q-.03.06-.03.11v3.32q0 .06.03.11.02.05.06.09t.09.07q.05.02.11.02h1.85v8.59c0 3.48 1.73 5.24 5.14 5.24 1.39 0 2.54-.29 3.62-.9q.03-.02.06-.05.03-.02.05-.06.02-.03.03-.07.01-.03 0-.07v-3.23q-.01-.04-.03-.07l-.04-.06-.06-.04q-.03-.02-.06-.03l-.08-.02q-.03 0-.07.01-.03.01-.06.03c-.75.37-1.47.54-2.27.54-1.24 0-1.8-.56-1.8-1.82v-7.99h4.26q.05 0 .1-.02.06-.02.1-.06.03-.04.06-.1.02-.05.02-.1v-3.33q0-.05-.02-.1-.02-.06-.06-.1t-.09-.06-.11-.02m14.82.02v-.54c0-1.57.6-2.27 1.95-2.27.81 0 1.46.16 2.18.4q.07.03.13.02.07-.02.13-.06.05-.04.08-.1t.03-.13v-3.25q0-.05-.01-.09-.02-.05-.04-.08-.03-.04-.07-.06-.03-.03-.08-.04c-.76-.23-1.74-.47-3.21-.47-3.57 0-5.46 2.01-5.46 5.82v.81h-1.86q-.05 0-.1.03-.06.02-.1.06t-.06.09-.02.11v3.34c0 .15.13.28.28.28h1.86v13.26c0 .15.13.28.29.28h3.86c.16 0 .28-.13.28-.28V23.07h3.61l5.53 13.26c-.63 1.39-1.24 1.66-2.09 1.66q-1.02 0-2.13-.6-.02-.01-.05-.02t-.06-.01q-.03-.01-.06 0-.02 0-.05.01t-.05.02q-.03.02-.05.04l-.04.04q-.02.02-.03.05l-1.31 2.87q-.02.05-.03.11 0 .05.02.1t.05.09q.04.05.08.07c1.37.74 2.6 1.06 4.13 1.06 2.85 0 4.43-1.33 5.82-4.91l6.71-17.33q.01-.03.01-.06.01-.04 0-.07 0-.04-.01-.07t-.03-.06-.05-.05q-.02-.02-.05-.04-.03-.01-.07-.02-.03-.01-.06-.01h-4.03q-.04 0-.09.01-.04.01-.07.04-.04.03-.07.06l-.04.08-4.12 11.77-4.51-11.78q-.02-.04-.05-.07-.02-.04-.06-.06-.03-.03-.07-.04t-.09-.01zm-8.59-.02h-3.87q-.05 0-.11.02-.05.02-.09.06t-.06.1q-.02.05-.02.1v16.87c0 .15.13.28.28.28h3.87c.15 0 .28-.13.28-.28V19.47q0-.06-.02-.11-.02-.06-.06-.1t-.09-.06q-.06-.02-.11-.02m-1.91-7.68c-1.53 0-2.78 1.24-2.78 2.77q0 .55.21 1.06.22.51.61.9t.9.61q.51.21 1.06.21c1.53 0 2.77-1.24 2.77-2.78q0-.55-.21-1.06-.22-.51-.6-.9-.39-.38-.9-.6-.51-.21-1.06-.21"/></svg>`;
    case "youtubemusic":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 165 50" width="165" height="50" overflow="visible" style="fill:currentColor; overflow:visible;"><path d="M25.41 0C11.38 0 0 11.19 0 25s11.38 25 25.41 25c14.04 0 25.42-11.19 25.42-25 0-13.8-11.38-25-25.42-25m0 41.35a16.35 16.35 0 0 1-15.09-10.1 16.33 16.33 0 0 1 3.55-17.81c4.67-4.67 11.7-6.07 17.81-3.54a16.34 16.34 0 0 1 10.08 15.11c0 2.14-.42 4.27-1.24 6.25s-2.03 3.79-3.54 5.3a16.3 16.3 0 0 1-5.31 3.54c-1.98.83-4.1 1.25-6.25 1.25z"/><path d="M25.52 11.22c-5.58 0-10.61 3.36-12.75 8.51a13.81 13.81 0 0 0 2.99 15.03c3.95 3.94 9.88 5.12 15.03 2.99 5.16-2.14 8.52-7.17 8.52-12.74 0-1.81-.36-3.61-1.05-5.28-.7-1.67-1.71-3.19-2.99-4.48-1.28-1.28-2.8-2.29-4.48-2.98-1.67-.7-3.46-1.05-5.27-1.05M20.21 32.3V17.71L33.54 25zm57.71-12.29c-1.25 6.04-2.09 13.12-2.5 16.24h-.41c-.42-3.12-1.26-10.2-2.51-16.04L69.38 5.63H60V45h5.84V12.5l.62 3.13L72.5 45h5.84l5.83-29.37.42-3.13v32.3h5.83V5.63h-9.58c.21 0-2.92 14.38-2.92 14.38m28.33 18.95q-.21.4-.52.74t-.69.58q-.38.25-.82.39-.43.14-.88.17c-1.25 0-1.88-1.04-1.88-3.55V16.25H94.8V37.5c0 5.21 1.87 7.71 5.83 7.71 2.71 0 4.79-1.25 6.46-3.96h.21l.62 3.55h5.21V16.25h-6.88zm19.59-11.46c-2.09-1.45-3.54-2.5-3.54-4.79q0-2.5 2.49-2.5c1.88 0 2.51 1.25 2.51 5.62l5.62-.2c.42-6.88-1.87-9.79-8.13-9.79-5.62 0-8.53 2.5-8.53 7.5 0 4.58 2.29 6.66 6.04 9.58 3.33 2.5 5.2 3.75 5.2 5.84 0 1.45-1.04 2.49-2.71 2.49-2.08 0-3.12-1.87-2.91-5h-5.62c-.84 6.04 1.66 9.38 8.12 9.38 5.83 0 8.75-2.5 8.75-7.71.41-4.79-2.08-6.67-7.29-10.42m11.25-11.25h6.46V44.8h-6.46zm3.33-11.46c-2.5 0-3.54.83-3.54 3.96 0 3.12 1.25 3.96 3.54 3.96 2.5 0 3.54-.84 3.54-3.96 0-2.92-1.04-3.96-3.54-3.96M165 34.58l-5.83-.21c0 5-.62 6.67-2.5 6.67-1.87 0-2.29-1.88-2.29-7.71V27.7c0-5.83.42-7.49 2.29-7.49 1.88 0 2.29 1.66 2.29 7.08l5.84-.42c.41-4.37-.21-7.5-1.88-9.16-1.25-1.25-3.33-1.88-6.04-1.88-6.46 0-9.17 3.34-9.17 12.92v3.95c0 9.8 2.29 12.93 8.96 12.93 2.71 0 4.79-.63 6.04-1.88 1.67-1.88 2.29-4.79 2.29-9.17"/></svg>`;
    case "deezer":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 50" width="180" height="50" overflow="visible" style="fill:currentColor; overflow:visible;"><path fill-rule="evenodd" d="M101.96 31.92H85.68V12.18h16.28v5.33h-8.6v2.28h8.08v4.36h-8.08v2.43h8.6zm18.12 0H103.8V12.19h16.28v5.33h-8.6v2.28h8.08v4.36h-8.08v2.43h8.6zm50.38 0q-1.24-3.85-3.8-8.17v8.17h-7.7V12.18h10.78c5.23 0 8.55 1.69 8.55 5.28 0 2.36-1.46 3.9-3.9 4.61 2.09 3.61 3.63 6.83 4.75 9.85zM169.32 21c1.14 0 1.78-.62 1.78-1.74 0-1.14-.64-1.74-1.78-1.74h-2.66V21zM157.1 31.92h-16.28V12.18h16.28v5.34h-8.61v2.28h8.09v4.36h-8.09v2.43h8.61zm-35.19-19.74h17.33v5.33c-3.94 3.27-6.74 6.16-8.74 9.07h8.74v5.34h-17.49v-5.34c2.1-3.32 4.81-6.37 8.11-9.07h-7.95zm-57.8 0h9.91c6.14 0 10.47 4.07 10.47 9.87s-4.33 9.87-10.47 9.87h-9.91zm7.7 14.42h1.8c1.93 0 2.95-1.29 2.95-4.55 0-3.25-1.02-4.54-2.95-4.54h-1.8zM42.45 7.63c.47-2.68 1.15-4.36 1.89-4.36h.01c1.4 0 2.54 5.84 2.54 13.07 0 7.21-1.14 13.07-2.55 13.07-.57 0-1.1-1-1.53-2.66-.68 6.09-2.08 10.29-3.71 10.29-1.25 0-2.38-2.52-3.14-6.49-.52 7.54-1.81 12.9-3.34 12.9-.95 0-1.82-2.12-2.46-5.57-.78 7.13-2.57 12.13-4.66 12.13s-3.87-5-4.65-12.13c-.63 3.45-1.51 5.57-2.47 5.57-1.53 0-2.82-5.36-3.34-12.9-.75 3.97-1.88 6.49-3.14 6.49-1.63 0-3.03-4.19-3.7-10.29-.43 1.66-.97 2.66-1.54 2.66-1.41 0-2.55-5.86-2.55-13.07 0-7.23 1.14-13.07 2.55-13.07.76 0 1.42 1.69 1.89 4.36C9.3 3.01 10.52.01 11.9.01c1.63 0 3.05 4.25 3.72 10.42.65-4.49 1.65-7.36 2.76-7.36 1.56 0 2.89 5.63 3.38 13.49.92-4.03 2.26-6.55 3.74-6.55 1.49 0 2.82 2.52 3.75 6.55.49-7.86 1.81-13.49 3.37-13.49 1.12 0 2.11 2.87 2.77 7.36C36.06 4.26 37.47.01 39.11.01c1.37 0 2.6 3 3.34 7.62M1.92 20.89c-.8 0-1.44-2.61-1.44-5.84s.64-5.84 1.44-5.84 1.45 2.61 1.45 5.84-.65 5.84-1.45 5.84m47.16 0c-.8 0-1.45-2.61-1.45-5.84s.65-5.84 1.45-5.84 1.44 2.61 1.44 5.84-.64 5.84-1.44 5.84"/></svg>`;
    case "lastfm":
      return `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50" overflow="visible" style="fill:currentColor; overflow:visible;"><path d="m44.71 45.91-2.36-6.41s-3.83 4.27-9.58 4.27c-5.08 0-8.69-4.42-8.69-11.49 0-9.06 4.57-12.3 9.06-12.3 6.48 0 8.55 4.2 10.31 9.58l2.36 7.36c2.36 7.15 6.78 12.89 19.52 12.89 9.13 0 15.32-2.8 15.32-10.16 0-5.97-3.39-9.06-9.72-10.53l-4.72-1.04c-3.24-.73-4.19-2.06-4.19-4.27 0-2.5 1.98-3.98 5.23-3.98 3.53 0 5.45 1.33 5.74 4.5l7.37-.89c-.59-6.63-5.16-9.35-12.67-9.35-6.63 0-13.11 2.5-13.11 10.53 0 5.01 2.43 8.18 8.54 9.65l5.01 1.18c3.76.88 5.01 2.43 5.01 4.57 0 2.72-2.65 3.83-7.66 3.83-7.44 0-10.54-3.91-12.3-9.28l-2.43-7.37c-3.1-9.58-8.03-13.11-17.83-13.11-10.83 0-16.57 6.85-16.57 18.49 0 11.19 5.74 17.23 16.06 17.23 8.32 0 12.3-3.9 12.3-3.9m-31.52-3.46c-.74.22-1.48.37-2.44.37-1.76 0-3.02-.81-3.02-2.95V-.28H0v41.99c0 5.52 3.83 7.81 8.32 7.81 1.48 0 2.88-.22 4.64-.66zm93.18-1.18c-1.92 1.32-3.54 1.99-5.75 1.99-2.8 0-4.35-1.48-4.35-5.09V20.94h10.17V14.9H96.35V6.72l-7.81.96v7.22h-4.93v6.04h4.93v18.85c0 6.78 3.9 10.02 10.24 10.02 3.46 0 6.55-.66 8.99-2.06zm6.71 2.65c0 3.02 2.36 5.45 5.38 5.45 3.17 0 5.53-2.43 5.53-5.45 0-3.09-2.36-5.45-5.53-5.45-3.02 0-5.38 2.36-5.38 5.45m18.91-22.98v27.99h7.74V20.94h8.69V14.9h-8.69v-3.09c0-4.64 1.99-6.12 5.23-6.12 2.28 0 3.83.52 5.59 1.48l1.26-6.49c-2.07-.95-4.5-1.47-7.44-1.47-6.49 0-12.38 3.09-12.38 12.3v3.39h-4.93v6.04zm47.24.66c-.88-5.52-4.49-7.51-9.21-7.51-4.71 0-8.76 2.14-10.53 7.37l-.96-6.56h-6.26v34.03h7.74V29.71c0-6.56 3.39-9.07 6.99-9.07 3.76 0 5.31 2.51 5.31 6.56v21.73h7.66v-19.3c0-6.48 3.46-8.99 7.07-8.99 3.68 0 5.23 2.51 5.23 6.56v21.73H200V24.48c0-7.3-4.27-10.39-9.94-10.39-4.79 0-9.06 2.14-10.83 7.51"/></svg>`;
    default:
      return "";
  }
}

function updateModeSegmentedUI() {
  const modeSegmented = document.getElementById("cardsModeSegmented");
  const animatedWrapper = document.getElementById("animatedBtnWrapper");
  const btnAnimated = document.getElementById("btnModeAnimated");
  const tooltipEl = document.getElementById("animatedTooltip");
  const downloadBtnSpan = document.querySelector("#btnDownloadCard span");

  if (modeSegmented) {
    modeSegmented.querySelectorAll(".segment-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === currentMode);
    });
  }

  if (btnAnimated && animatedWrapper && tooltipEl) {
    if (isCheckingAnimated) {
      btnAnimated.classList.add("is-disabled");
      btnAnimated.setAttribute("aria-disabled", "true");
      animatedWrapper.classList.add("has-tooltip");
      tooltipEl.textContent = "Checking animated cover...";
    } else if (currentAnimatedUrl) {
      btnAnimated.classList.remove("is-disabled");
      btnAnimated.setAttribute("aria-disabled", "false");
      animatedWrapper.classList.remove("has-tooltip", "tooltip-visible");
    } else {
      btnAnimated.classList.add("is-disabled");
      btnAnimated.setAttribute("aria-disabled", "true");
      animatedWrapper.classList.add("has-tooltip");
      tooltipEl.textContent = "Animated cover unavailable for this item";
    }
  }

  if (downloadBtnSpan) {
    downloadBtnSpan.textContent = currentMode === "animated" ? "Download MP4" : "Download PNG";
  }
}

function showStep(stepName) {
  const stepResults = document.getElementById("stepResults");
  const stepLayout = document.getElementById("stepLayout");

  if (stepResults) stepResults.style.display = "none";
  if (stepLayout) stepLayout.style.display = "none";

  const target = stepName === "results" ? stepResults : stepLayout;
  if (target) {
    target.style.display = "flex";
    target.classList.remove("fade-in");
    void target.offsetWidth;
    target.classList.add("fade-in");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  saveCardsState(stepName);
}

function saveCardsState(stepOverride) {
  if (!currentItem) return;
  const stepLayout = document.getElementById("stepLayout");
  const currentStep =
    stepOverride ||
    (stepLayout && stepLayout.style.display !== "none" ? "layout" : "results");

  const state = {
    searchQuery: new URLSearchParams(window.location.search).get("search") || "",
    step: currentStep,
    item: currentItem,
    layout: currentLayout,
    mode: currentMode,
    animatedUrl: currentAnimatedUrl,
    customColor,
    service: currentService,
  };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch { }
}

function restoreCardsStateIfAvailable(currentQuery) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (!state || !state.item) return false;
    if (currentQuery && state.searchQuery && state.searchQuery.toLowerCase() !== currentQuery.toLowerCase()) {
      sessionStorage.removeItem(CACHE_KEY);
      return false;
    }
    if (state.step === "results") {
      return false;
    }

    currentItem = state.item;
    currentLayout = state.layout || "card";
    currentMode = state.mode || "static";
    currentAnimatedUrl = state.animatedUrl || null;
    customColor = state.customColor || null;
    currentService = state.service || "none";

    const serviceSelectEl = document.getElementById("cardsServiceSelect");
    if (serviceSelectEl) serviceSelectEl.value = currentService;

    const colorPickerBtn = document.getElementById("btnCardsColorPicker");
    const colorInput = document.getElementById("cardsColorInput");
    const resetColorBtn = document.getElementById("btnResetCardsColor");
    if (customColor) {
      if (colorInput) colorInput.value = customColor;
      if (colorPickerBtn) {
        colorPickerBtn.style.backgroundColor = customColor;
        colorPickerBtn.style.borderColor = customColor;
      }
      if (resetColorBtn) resetColorBtn.style.display = "flex";
    }

    prepareAndShowLayoutStep(currentItem, true);
    return true;
  } catch {
    return false;
  }
}

async function prepareAndShowLayoutStep(item, isRestoring = false) {
  if (item) {
    currentItem = item;
  }
  if (!currentItem) return;

  if (!isRestoring) {
    currentMode = "static";
    currentAnimatedUrl = null;
    isCheckingAnimated = true;
  }

  updateModeSegmentedUI();
  showStep("layout");

  if (currentItem.cover) {
    extractedDominant = await extractDominantColor(currentItem.cover);
  }
  renderLayouts();
  saveCardsState("layout");

  if (!isRestoring || !currentAnimatedUrl) {
    isCheckingAnimated = true;
    updateModeSegmentedUI();
    const targetItem = currentItem;
    const foundMp4 = await fetchAnimatedArtwork(targetItem);
    if (currentItem === targetItem) {
      currentAnimatedUrl = foundMp4;
      isCheckingAnimated = false;
      if (!currentAnimatedUrl && currentMode === "animated") {
        currentMode = "static";
      }
      updateModeSegmentedUI();
      renderLayouts();
      saveCardsState("layout");
    }
  }
}

function getCardAppearance() {
  const rgb = customColor ? hexToRgb(customColor) : { r: 255, g: 255, b: 255 };
  const r = rgb ? rgb.r : 255;
  const g = rgb ? rgb.g : 255;
  const b = rgb ? rgb.b : 255;
  const cardBg = `rgba(${r}, ${g}, ${b}, 0.9)`;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isDark = brightness < 140;
  const textColor = isDark ? "#FFFFFF" : "#141518";
  const mutedTextColor = isDark ? "rgba(255, 255, 255, 0.72)" : "rgba(20, 21, 24, 0.65)";
  return { cardBg, textColor, mutedTextColor };
}

function buildInnerCardHtml(useVideo, layoutId = "card") {
  const { cardBg, textColor, mutedTextColor } = getCardAppearance();
  const serviceLogoSvg = getServiceLogoSvg(currentService);

  const mediaHtml =
    useVideo && currentAnimatedUrl
      ? `<video src="${escapeHTML(currentAnimatedUrl)}" poster="${escapeHTML(currentItem.cover || "/logo.svg")}" class="music-card-cover-video" autoplay loop muted playsinline crossorigin="anonymous"></video>`
      : `<img src="${escapeHTML(currentItem.cover || "/logo.svg")}" alt="Cover" class="music-card-cover-img" crossorigin="anonymous" draggable="false" />`;

  const isStory = layoutId === "solid" || layoutId === "blurred";
  const logoColor = isStory ? "rgba(255, 255, 255, 0.9)" : textColor;

  return `
    <div class="music-card-wrapper">
      <div class="music-card-target" style="background-color: ${cardBg}; color: ${textColor};">
        <div class="music-card-cover-container">
          ${mediaHtml}
        </div>
        <div class="music-card-meta">
          <span class="music-card-title" style="color: ${textColor};">${escapeHTML(currentItem.title)}</span>
          <span class="music-card-artist" style="color: ${mutedTextColor};">${escapeHTML(currentItem.artist)}</span>
        </div>
      </div>
      ${serviceLogoSvg ? `<div class="music-card-service-logo" style="color: ${logoColor};">${serviceLogoSvg}</div>` : ""}
    </div>
  `;
}

function renderLayouts() {
  const grid = document.getElementById("cardsLayoutsGrid");
  if (!grid || !currentItem) return;

  const useVideo = currentMode === "animated" && Boolean(currentAnimatedUrl);
  const solidBg = clampHexBrightness(extractedDominant.hex, 138);

  const layouts = [
    {
      id: "card",
      name: "Card",
      frameStyle: "",
      bgHtml: "",
      html: buildInnerCardHtml(useVideo, "card"),
    },
    {
      id: "solid",
      name: "Flat",
      frameStyle: `background-color: ${solidBg};`,
      bgHtml: "",
      html: buildInnerCardHtml(useVideo, "solid"),
    },
    {
      id: "blurred",
      name: "Blurred",
      frameStyle: `background-color: ${extractedDominant.darkerHex};`,
      bgHtml: `<img src="${escapeHTML(currentItem.cover || "/logo.svg")}" class="story-blur-image" alt="Blurred BG" crossorigin="anonymous" />`,
      html: buildInnerCardHtml(useVideo, "blurred"),
    },
  ];

  grid.innerHTML = layouts
    .map(
      (l) => `
      <div class="lyrics-layout-item ${currentLayout === l.id ? "selected" : ""}" data-layout="${l.id}">
        <div class="lyrics-layout-item-header">
          <span class="lyrics-layout-item-title">${l.name}</span>
          <div class="lyrics-layout-item-badge">
            <animate-icons name="check" size="14"></animate-icons>
          </div>
        </div>
        <div class="lyrics-layout-frame format-story" id="frame_${l.id}" style="${l.frameStyle}">
          ${l.bgHtml}
          ${l.html}
        </div>
      </div>
    `
    )
    .join("");

  grid.querySelectorAll(".lyrics-layout-item").forEach((el) => {
    el.addEventListener("click", () => {
      currentLayout = el.dataset.layout;
      grid.querySelectorAll(".lyrics-layout-item").forEach((item) => {
        item.classList.toggle("selected", item.dataset.layout === currentLayout);
      });
      if (typeof umami !== "undefined") {
        umami.track("Cards Layout Selected", { layout: currentLayout });
      }
      saveCardsState("layout");
    });
  });
}

function createExportElement(layoutId) {
  if (!currentItem) return null;

  const innerCardHtml = buildInnerCardHtml(false, layoutId);
  const solidBg = clampHexBrightness(extractedDominant.hex, 138);
  const isStoryFrame = layoutId === "solid" || layoutId === "blurred";

  const wrapper = document.createElement("div");
  wrapper.className = `lyrics-export-wrapper ${isStoryFrame ? "export-story" : "export-card"} export-${layoutId}`;

  if (isStoryFrame) {
    const bgStyle =
      layoutId === "solid"
        ? `background-color: ${solidBg};`
        : `background-color: ${extractedDominant.darkerHex};`;
    const bgImgHtml =
      layoutId === "blurred"
        ? `<img src="${escapeHTML(currentItem.cover || "/logo.svg")}" class="story-blur-image" alt="Blurred BG" crossorigin="anonymous" />`
        : "";

    wrapper.style.cssText = `
      width: 360px;
      height: 640px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.25rem;
      margin: 0;
      border: none;
      border-radius: 0;
      box-shadow: none;
      box-sizing: border-box;
      ${bgStyle}
    `;
    wrapper.innerHTML = `
      ${bgImgHtml}
      ${innerCardHtml}
    `;
  } else {
    wrapper.style.cssText = `
      width: 220px !important;
      min-width: 220px !important;
      max-width: 220px !important;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      border: none;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    `;
    wrapper.innerHTML = innerCardHtml;
  }

  return wrapper;
}

function prepareExportDOM(exportNode) {
  const allNodes = [exportNode, ...exportNode.querySelectorAll("*")];
  const fontRecords = allNodes.map((el) => {
    const computed = window.getComputedStyle(el);
    const origFontSize = computed.getPropertyValue("font-size");
    let reducedFontSize = origFontSize;
    if (origFontSize && origFontSize.endsWith("px")) {
      const reduced = Math.floor(parseFloat(origFontSize.slice(0, -2))) - 0.1;
      reducedFontSize = `${reduced}px`;
    }
    return { el, origFontSize, reducedFontSize };
  });

  fontRecords.forEach(({ el, reducedFontSize }) => {
    if (reducedFontSize) {
      el.style.setProperty("font-size", reducedFontSize, "important");
    }
  });

  void exportNode.offsetHeight;

  const sizeRecords = allNodes.map((el) => {
    const rect = el.getBoundingClientRect();
    return { el, height: rect.height };
  });
  const targetRect = exportNode.getBoundingClientRect();

  sizeRecords.forEach(({ el, height }) => {
    if (height > 0) {
      el.style.setProperty("height", `${height}px`, "important");
      el.style.setProperty("block-size", `${height}px`, "important");
    }
  });

  fontRecords.forEach(({ el, origFontSize }) => {
    if (origFontSize) {
      el.style.setProperty("font-size", origFontSize, "important");
    }
  });

  return targetRect;
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function u32(v) {
  return new Uint8Array([(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]);
}

function u16(v) {
  return new Uint8Array([(v >>> 8) & 0xff, v & 0xff]);
}

function asciiBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function concatBytes(...arrays) {
  let total = 0;
  for (let i = 0; i < arrays.length; i++) total += arrays[i].byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < arrays.length; i++) {
    out.set(arrays[i], offset);
    offset += arrays[i].byteLength;
  }
  return out;
}

function mp4Box(type, ...payloads) {
  const body = concatBytes(...payloads);
  return concatBytes(u32(8 + body.byteLength), asciiBytes(type), body);
}

function mp4FullBox(type, version, flags, ...payloads) {
  const vf = new Uint8Array([
    version & 0xff,
    (flags >>> 16) & 0xff,
    (flags >>> 8) & 0xff,
    flags & 0xff,
  ]);
  return mp4Box(type, vf, ...payloads);
}

function bufferSourceToUint8Array(src) {
  if (!src) return null;
  if (src instanceof Uint8Array) {
    return new Uint8Array(src);
  }
  if (ArrayBuffer.isView(src)) {
    return new Uint8Array(new Uint8Array(src.buffer, src.byteOffset, src.byteLength));
  }
  if (src instanceof ArrayBuffer) {
    return new Uint8Array(src.slice(0));
  }
  return null;
}

function splitAvccNals(buf) {
  const out = [];
  let p = 0;
  while (p + 4 <= buf.byteLength) {
    const len = ((buf[p] << 24) | (buf[p + 1] << 16) | (buf[p + 2] << 8) | buf[p + 3]) >>> 0;
    if (len < 2 || p + 4 + len > buf.byteLength) return null;
    out.push(buf.subarray(p + 4, p + 4 + len));
    p += 4 + len;
  }
  return p === buf.byteLength ? out : null;
}

function buildAvcCFromSets(spsList, ppsList) {
  const s0 = spsList[0];
  const parts = [new Uint8Array([1, s0[1], s0[2], s0[3], 0xff, 0xe0 | spsList.length])];
  spsList.forEach((s) => parts.push(u16(s.length), s));
  parts.push(new Uint8Array([ppsList.length]));
  ppsList.forEach((n) => parts.push(u16(n.length), n));
  if ([100, 110, 122, 144].includes(s0[1])) parts.push(new Uint8Array([0xfd, 0xf8, 0xf8, 0x00]));
  return concatBytes(...parts);
}

function muxAvcSamplesToMp4(width, height, fps, avcCBytes, rawSamples) {
  let runningVideoOffset = 0;
  const videoSamples = rawSamples.map((s) => {
    const item = { data: s.data, isKey: s.isKey, offset: runningVideoOffset };
    runningVideoOffset += s.data.byteLength;
    return item;
  });
  const mdatPayloadSize = runningVideoOffset;

  const movieTimescale = 1000;
  const videoTimescale = fps * 1000;
  const videoSampleDelta = 1000;
  const videoDuration = videoSamples.length * videoSampleDelta;
  const durationSeconds = videoSamples.length / fps;
  const movieDuration = Math.round(durationSeconds * movieTimescale);

  const nowMp4Time = Math.floor(Date.now() / 1000) + 2082844800;

  const matrix = concatBytes(
    u32(0x00010000), u32(0), u32(0),
    u32(0), u32(0x00010000), u32(0),
    u32(0), u32(0), u32(0x40000000)
  );

  const avcCBox = avcCBytes && avcCBytes.byteLength > 0 ? mp4Box("avcC", avcCBytes) : new Uint8Array(0);
  const paspBox = mp4Box("pasp", u32(1), u32(1));
  const colrBox = mp4Box("colr", asciiBytes("nclx"), u16(1), u16(1), u16(1), new Uint8Array([0x00]));

  const avc1Box = mp4Box(
    "avc1",
    new Uint8Array(6), u16(1), new Uint8Array(16),
    u16(width), u16(height),
    u32(0x00480000), u32(0x00480000), u32(0), u16(1),
    new Uint8Array(32), u16(0x0018), u16(0xffff),
    avcCBox, colrBox, paspBox
  );

  const vStsd = mp4FullBox("stsd", 0, 0, u32(1), avc1Box);
  const vStts = mp4FullBox("stts", 0, 0, u32(1), u32(videoSamples.length), u32(videoSampleDelta));

  const keyIndices = [];
  videoSamples.forEach((s, idx) => { if (s.isKey) keyIndices.push(u32(idx + 1)); });
  const vStss = mp4FullBox("stss", 0, 0, u32(keyIndices.length), ...keyIndices);
  const vStsc = mp4FullBox("stsc", 0, 0, u32(1), u32(1), u32(1), u32(1));
  const vStsz = mp4FullBox("stsz", 0, 0, u32(0), u32(videoSamples.length), ...videoSamples.map((s) => u32(s.data.byteLength)));

  function buildMoov(baseOffset) {
    const vStco = mp4FullBox("stco", 0, 0, u32(videoSamples.length), ...videoSamples.map((s) => u32(baseOffset + s.offset)));
    const vStbl = mp4Box("stbl", vStsd, vStts, vStss, vStsc, vStsz, vStco);
    const vmhd = mp4FullBox("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0));
    const dref = mp4FullBox("dref", 0, 0, u32(1), mp4FullBox("url ", 0, 1));
    const dinf = mp4Box("dinf", dref);
    const vMinf = mp4Box("minf", vmhd, dinf, vStbl);
    const vMdhd = mp4FullBox("mdhd", 0, 0, u32(nowMp4Time), u32(nowMp4Time), u32(videoTimescale), u32(videoDuration), u16(0x55c4), u16(0));
    const vHdlr = mp4FullBox("hdlr", 0, 0, u32(0), asciiBytes("vide"), new Uint8Array(12), asciiBytes("VideoHandler\0"));
    const vMdia = mp4Box("mdia", vMdhd, vHdlr, vMinf);
    const vElst = mp4FullBox("elst", 0, 0, u32(1), u32(movieDuration), u32(0), u16(1), u16(0));
    const vEdts = mp4Box("edts", vElst);
    const vTkhd = mp4FullBox(
      "tkhd", 0, 3,
      u32(nowMp4Time), u32(nowMp4Time), u32(1), u32(0), u32(movieDuration),
      new Uint8Array(8), u16(0), u16(0), u16(0), u16(0),
      matrix, u32(width << 16), u32(height << 16)
    );
    const vTrak = mp4Box("trak", vTkhd, vEdts, vMdia);

    const mvhd = mp4FullBox(
      "mvhd", 0, 0,
      u32(nowMp4Time), u32(nowMp4Time), u32(movieTimescale), u32(movieDuration),
      u32(0x00010000), u16(0x0100), new Uint8Array(10),
      matrix, new Uint8Array(24), u32(2)
    );
    return mp4Box("moov", mvhd, vTrak);
  }

  const ftyp = mp4Box("ftyp", asciiBytes("mp42"), u32(0), asciiBytes("mp42isomiso2avc1mp41"));
  const draftMoov = buildMoov(0);
  const mdatPayloadStart = ftyp.byteLength + draftMoov.byteLength + 8;
  const moov = buildMoov(mdatPayloadStart);
  const mdatHeader = concatBytes(u32(8 + mdatPayloadSize), asciiBytes("mdat"));

  return new Blob([ftyp, moov, mdatHeader, ...videoSamples.map((s) => s.data)], { type: "video/mp4" });
}

async function exportStaticCardImage() {
  if (!currentItem) return;

  const exportModal = document.getElementById("cardsExportModal");
  if (exportModal) exportModal.classList.add("show");

  const exportContainer = document.createElement("div");
  exportContainer.style.cssText = `
    position: fixed;
    top: -9999px;
    left: 0;
    width: 1200px;
    height: 1200px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    z-index: -9999;
  `;
  document.body.appendChild(exportContainer);

  try {
    if (currentItem.cover) {
      await preloadImage(currentItem.cover);
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const exportNode = createExportElement(currentLayout);
    if (!exportNode) return;
    exportContainer.appendChild(exportNode);

    const targetRect = prepareExportDOM(exportNode);

    const dataUrl = await htmlToImage.toPng(exportNode, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: null,
      width: Math.round(targetRect.width),
      height: Math.round(targetRect.height),
    });

    const link = document.createElement("a");
    const cleanTitle = (currentItem.title || "card").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `bubblefm_${cleanTitle}_${currentLayout}.png`;
    link.href = dataUrl;
    link.click();

    if (typeof umami !== "undefined") {
      umami.track("report_download", {
        tool: "cards",
        mode: "static",
        layout: currentLayout,
        service: currentService,
        has_custom_color: Boolean(customColor),
      });
    }
  } catch (err) {
    console.error("Export error:", err);
    if (typeof umami !== "undefined") {
      umami.track("api_error", {
        tool: "cards",
        reason: err.message || "export_failed",
      });
    }
  } finally {
    if (exportContainer.parentNode) {
      exportContainer.parentNode.removeChild(exportContainer);
    }
    if (exportModal) {
      setTimeout(() => {
        exportModal.classList.remove("show");
      }, 500);
    }
  }
}

async function exportAnimatedCardVideo() {
  if (!currentItem || !currentAnimatedUrl) return;

  const exportModal = document.getElementById("cardsExportModal");
  if (exportModal) exportModal.classList.add("show");

  const exportContainer = document.createElement("div");
  exportContainer.style.cssText = `
    position: fixed;
    top: -9999px;
    left: 0;
    width: 1200px;
    height: 1200px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    z-index: -9999;
  `;
  document.body.appendChild(exportContainer);

  try {
    if (currentItem.cover) {
      await preloadImage(currentItem.cover);
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const exportNode = createExportElement(currentLayout);
    if (!exportNode) return;
    exportContainer.appendChild(exportNode);

    const targetRect = prepareExportDOM(exportNode);
    const coverContainer = exportNode.querySelector(".music-card-cover-container");
    const coverRect = coverContainer.getBoundingClientRect();

    const relX = coverRect.left - targetRect.left;
    const relY = coverRect.top - targetRect.top;
    const relW = coverRect.width;
    const relH = coverRect.height;
    const borderRadius = parseFloat(window.getComputedStyle(coverContainer).borderRadius) || 8;

    const scale = currentLayout === "card" ? 3 : 2;
    const baseCanvas = await htmlToImage.toCanvas(exportNode, {
      pixelRatio: scale,
      cacheBust: true,
      backgroundColor: null,
      width: Math.round(targetRect.width),
      height: Math.round(targetRect.height),
    });

    const video = await preloadVideo(currentAnimatedUrl);
    if (!video) {
      if (typeof umami !== "undefined") {
        umami.track("api_error", {
          tool: "cards",
          reason: "video_preload_failed",
        });
      }
      await exportStaticCardImage();
      return;
    }

    video.loop = true;
    video.muted = true;
    video.currentTime = 0;

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(baseCanvas.width / 16) * 16;
    canvas.height = Math.ceil(baseCanvas.height / 16) * 16;
    const offsetX = Math.floor((canvas.width - baseCanvas.width) / 2);
    const offsetY = Math.floor((canvas.height - baseCanvas.height) / 2);
    const ctx = canvas.getContext("2d", { alpha: false });

    const coverW = Math.max(2, Math.round(relW * scale));
    const coverH = Math.max(2, Math.round(relH * scale));

    const rawDuration = video.duration && isFinite(video.duration) && video.duration > 0 ? video.duration : 6;
    const loops = Math.max(1, Math.min(3, Math.round(14 / rawDuration)));
    const singleLoopMs = Math.min(10000, Math.max(3000, Math.round(rawDuration * 1000)));
    const fps = 30;
    const fallbackBg = extractedDominant?.darkerHex || "#141518";

    const drawCompositeFrame = (sourceImage) => {
      ctx.fillStyle = fallbackBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseCanvas, offsetX, offsetY, baseCanvas.width, baseCanvas.height);
      ctx.save();
      drawRoundedRectPath(
        ctx,
        offsetX + relX * scale,
        offsetY + relY * scale,
        relW * scale,
        relH * scale,
        borderRadius * scale
      );
      ctx.clip();
      ctx.drawImage(
        sourceImage,
        offsetX + relX * scale,
        offsetY + relY * scale,
        relW * scale,
        relH * scale
      );
      ctx.restore();
    };

    let mp4Blob = null;

    if (typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined") {
      const codecCandidates = [
        "avc1.420028",
        "avc1.42E028",
        "avc1.42001f",
        "avc1.42E01f",
        "avc1.42E01E",
        "avc1.4d0028",
        "avc1.640028",
      ];
      const accelCandidates = ["prefer-software", "no-preference"];
      let encoderConfig = null;

      outerLoop: for (const hardwareAcceleration of accelCandidates) {
        for (const codec of codecCandidates) {
          try {
            const candidate = {
              codec,
              width: canvas.width,
              height: canvas.height,
              bitrate: 5000000,
              framerate: fps,
              latencyMode: "realtime",
              hardwareAcceleration,
              avc: { format: "avc" },
            };
            const check = await VideoEncoder.isConfigSupported(candidate);
            if (check && check.supported) {
              encoderConfig = candidate;
              break outerLoop;
            }
          } catch { }
        }
      }

      if (encoderConfig) {
        const rawSamples = [];
        let avcCBytes = null;
        const spsSet = new Map();
        const ppsSet = new Map();
        let descFallback = null;
        let encoderFormatBad = false;

        const encoder = new VideoEncoder({
          output: (chunk, meta) => {
            const d = bufferSourceToUint8Array(meta?.decoderConfig?.description);
            if (d && d.byteLength > 0 && !descFallback) descFallback = d;

            const raw = new Uint8Array(chunk.byteLength);
            chunk.copyTo(raw);
            const nals = splitAvccNals(raw);
            if (!nals) {
              encoderFormatBad = true;
              rawSamples.push({ data: raw, isKey: chunk.type === "key" });
              return;
            }
            const kept = [];
            for (const nal of nals) {
              const type = nal[0] & 0x1f;
              if (type === 7) spsSet.set(nal.join(","), nal.slice());
              else if (type === 8) ppsSet.set(nal.join(","), nal.slice());
              else if (type !== 9) kept.push(u32(nal.length), nal);
            }
            rawSamples.push({ data: concatBytes(...kept), isKey: chunk.type === "key" });
          },
          error: (e) => console.error("VideoEncoder error:", e),
        });

        encoder.configure(encoderConfig);
        await video.play();

        const framesPerLoop = Math.max(30, Math.round((singleLoopMs / 1000) * fps));
        const frameIntervalMs = 1000 / fps;
        const frameDurationUs = Math.round(1000000 / fps);
        const loopCoverFrames = [];
        let globalFrameIdx = 0;

        for (let i = 0; i < framesPerLoop; i++) {
          const frameStart = performance.now();
          const snap = document.createElement("canvas");
          snap.width = coverW;
          snap.height = coverH;
          snap.getContext("2d").drawImage(video, 0, 0, coverW, coverH);
          loopCoverFrames.push(snap);

          drawCompositeFrame(snap);
          const vf = new VideoFrame(canvas, {
            timestamp: globalFrameIdx * frameDurationUs,
            duration: frameDurationUs,
          });
          encoder.encode(vf, { keyFrame: globalFrameIdx % 30 === 0 });
          vf.close();
          globalFrameIdx++;

          const elapsed = performance.now() - frameStart;
          const wait = Math.max(4, frameIntervalMs - elapsed);
          await new Promise((r) => setTimeout(r, wait));
        }

        video.pause();

        for (let l = 1; l < loops; l++) {
          for (let i = 0; i < loopCoverFrames.length; i++) {
            if (encoder.encodeQueueSize > 8) {
              await new Promise((r) => setTimeout(r, 10));
            }
            drawCompositeFrame(loopCoverFrames[i]);
            const vf = new VideoFrame(canvas, {
              timestamp: globalFrameIdx * frameDurationUs,
              duration: frameDurationUs,
            });
            encoder.encode(vf, { keyFrame: globalFrameIdx % 30 === 0 });
            vf.close();
            globalFrameIdx++;
          }
        }

        await encoder.flush();
        encoder.close();

        avcCBytes = spsSet.size && ppsSet.size
          ? buildAvcCFromSets([...spsSet.values()], [...ppsSet.values()])
          : descFallback;

        if (!encoderFormatBad && rawSamples.length > 0 && avcCBytes && avcCBytes.byteLength > 0) {
          mp4Blob = muxAvcSamplesToMp4(canvas.width, canvas.height, fps, avcCBytes, rawSamples);
        }
      }
    }

    if (!mp4Blob) {
      const mimeCandidates = [
        "video/mp4;codecs=avc1.640028",
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4;codecs=avc1",
        "video/mp4;codecs=h264",
        "video/mp4",
        "video/webm;codecs=h264",
        "video/webm",
      ];
      const mimeType =
        mimeCandidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
      const recordDurationMs = Math.min(15000, loops * singleLoopMs);
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 }
      );
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const recordingDone = new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      await video.play();
      recorder.start();
      const startTime = performance.now();
      await new Promise((resolve) => {
        function step(now) {
          drawCompositeFrame(video);
          if (now - startTime < recordDurationMs) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      });
      recorder.stop();
      video.pause();
      await recordingDone;
      mp4Blob = new Blob(chunks, { type: "video/mp4" });
    }

    const url = URL.createObjectURL(mp4Blob);
    const link = document.createElement("a");
    const cleanTitle = (currentItem.title || "card").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `bubblefm_${cleanTitle}_${currentLayout}.mp4`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    if (typeof umami !== "undefined") {
      umami.track("report_download", {
        tool: "cards",
        mode: "animated",
        layout: currentLayout,
        service: currentService,
        has_custom_color: Boolean(customColor),
      });
    }
  } catch (err) {
    console.error("Animated export error:", err);
    if (typeof umami !== "undefined") {
      umami.track("api_error", {
        tool: "cards",
        reason: err.message || "animated_export_failed",
      });
    }
  } finally {
    if (exportContainer.parentNode) {
      exportContainer.parentNode.removeChild(exportContainer);
    }
    if (exportModal) {
      setTimeout(() => {
        exportModal.classList.remove("show");
      }, 500);
    }
  }
}

async function initResultsPage(gridContainer) {
  const params = new URLSearchParams(window.location.search);
  const trackParam = params.get("track");
  const albumParam = params.get("album");
  const artistParam = params.get("artist") || "";
  const imageParam = params.get("image") || "";
  const query = params.get("search");

  if (trackParam || albumParam) {
    const isAlbum = Boolean(albumParam) && !trackParam;
    const title = isAlbum ? albumParam : trackParam;
    if (typeof umami !== "undefined") {
      umami.track("Cards Direct Loaded", { type: isAlbum ? "album" : "track" });
    }
    let coverUrl = getHighQualityCover(imageParam);
    if (!coverUrl) {
      try {
        const found = await searchTracksAndAlbums(`${title} ${artistParam}`);
        if (found && found.length > 0) {
          coverUrl = found[0].coverHq || found[0].cover;
        }
      } catch { }
    }
    const directItem = {
      type: isAlbum ? "album" : "track",
      id: "direct",
      title,
      artist: artistParam,
      cover: coverUrl,
      coverHq: coverUrl,
      album: albumParam || title,
    };
    prepareAndShowLayoutStep(directItem);
    return;
  }

  if (!query) {
    window.location.href = "/cards/";
    return;
  }

  const restored = restoreCardsStateIfAvailable(query);
  if (restored) {
    searchTracksAndAlbums(query).then((results) => {
      if (results && results.length > 0) {
        renderSearchCards(gridContainer, results);
      }
    });
    return;
  }

  const subtitle = document.getElementById("searchSubtitle");
  if (subtitle) {
    subtitle.innerHTML = `Showing results for "<strong>${escapeHTML(query)}</strong>"`;
  }

  try {
    const results = await searchTracksAndAlbums(query);

    if (!results || results.length === 0) {
      gridContainer.classList.remove("is-centered");
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0;">
          <p style="font-size: 1.1rem; color: var(--color-text-muted);">No tracks or albums found for "${escapeHTML(query)}".</p>
        </div>
      `;
      return;
    }

    renderSearchCards(gridContainer, results);
  } catch (error) {
    if (typeof umami !== "undefined") {
      umami.track("api_error", {
        tool: "cards",
        reason: error.message || "cards_fetch_failed",
      });
    }
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 0;">
        <p style="font-size: 1.1rem; color: var(--color-error);">Error loading results. Please try again.</p>
      </div>
    `;
  }
}

function renderSearchCards(gridContainer, results) {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const maxResults = isMobile ? 4 : 5;
  const sliced = results.slice(0, maxResults);
  gridContainer.classList.toggle("is-centered", sliced.length < 4);
  gridContainer.innerHTML = sliced
    .map(
      (item) => `
      <div class="lyrics-result-card">
        <div class="lyrics-card-cover-wrapper">
          <span class="cards-type-badge ${item.type}">${item.type === "album" ? "Album" : "Track"}</span>
          <img src="${escapeHTML(item.cover || "/logo.svg")}" alt="${escapeHTML(item.title)}" class="lyrics-card-cover" draggable="false" loading="lazy" />
        </div>
        <div class="lyrics-card-info">
          <h3 class="lyrics-card-title">${escapeHTML(item.title)}</h3>
          <p class="lyrics-card-artist"><span class="lyrics-card-artist-name">${escapeHTML(item.artist)}</span></p>
        </div>
        <button class="btn-primary lyrics-card-btn" data-type="${item.type}" data-id="${item.id}" data-title="${escapeHTML(item.title)}" data-artist="${escapeHTML(item.artist)}" data-album="${escapeHTML(item.album || "")}" data-cover="${escapeHTML(item.cover)}" data-cover-hq="${escapeHTML(item.coverHq || "")}">
          Use
        </button>
      </div>
    `
    )
    .join("");

  gridContainer.querySelectorAll(".lyrics-card-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (typeof umami !== "undefined") {
        umami.track("Cards Item Selected", { type: btn.dataset.type });
      }
      const item = {
        type: btn.dataset.type,
        id: btn.dataset.id,
        title: btn.dataset.title,
        artist: btn.dataset.artist,
        album: btn.dataset.album || btn.dataset.title,
        cover: btn.dataset.coverHq || getHighQualityCover(btn.dataset.cover),
        coverHq: btn.dataset.coverHq || getHighQualityCover(btn.dataset.cover),
      };
      prepareAndShowLayoutStep(item);
    });
  });
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

  const formCards = document.getElementById("form-cards");
  if (formCards) {
    formCards.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("cardsInput");
      const query = input ? input.value.trim() : "";
      if (query) {
        if (typeof umami !== "undefined") {
          umami.track("search_initiated", { tool: "cards" });
        }
        try {
          sessionStorage.removeItem(CACHE_KEY);
        } catch { }
        window.location.href = `result.html?search=${encodeURIComponent(query)}`;
      }
    });
  }

  const featureSections = document.querySelectorAll(".landing-features .feature-section");
  if (featureSections.length > 0) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      featureSections.forEach((section) => observer.observe(section));
    } else {
      featureSections.forEach((section) => section.classList.add("is-visible"));
    }
  }

  const resultsGrid = document.getElementById("cardsResultsGrid");
  if (resultsGrid) {
    initResultsPage(resultsGrid);
  }

  const tryAnotherBtn = document.getElementById("btnTryAnotherSearch");
  if (tryAnotherBtn) {
    tryAnotherBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof umami !== "undefined") {
        umami.track("Cards Try Another Clicked");
      }
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch { }
      if (window.history.length > 1 && document.referrer && document.referrer.includes("/cards")) {
        window.history.back();
      } else {
        window.location.href = "/cards/";
      }
    });
  }

  window.addEventListener("pageshow", () => {
    const input = document.getElementById("cardsInput");
    if (input) {
      input.focus();
      input.select();
    }
  });

  const backToResultsBtn = document.getElementById("btnBackToResults");
  if (backToResultsBtn) {
    backToResultsBtn.addEventListener("click", () => {
      showStep("results");
    });
  }

  const modeSegmented = document.getElementById("cardsModeSegmented");
  const animatedWrapper = document.getElementById("animatedBtnWrapper");
  if (modeSegmented) {
    modeSegmented.querySelectorAll(".segment-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        if (mode === "animated" && (isCheckingAnimated || !currentAnimatedUrl)) {
          if (animatedWrapper) {
            animatedWrapper.classList.add("tooltip-visible");
            if (tooltipTimer) clearTimeout(tooltipTimer);
            tooltipTimer = setTimeout(() => {
              animatedWrapper.classList.remove("tooltip-visible");
            }, 2400);
          }
          return;
        }
        if (mode === currentMode) return;
        currentMode = mode;
        updateModeSegmentedUI();
        if (typeof umami !== "undefined") {
          umami.track("Cards Mode Selected", { mode });
        }
        renderLayouts();
        saveCardsState("layout");
      });
    });
  }

  const btnOpenPersonalize = document.getElementById("btnOpenPersonalize");
  const btnClosePersonalize = document.getElementById("btnClosePersonalize");
  const btnDonePersonalize = document.getElementById("btnDonePersonalize");
  const personalizeModal = document.getElementById("cardsPersonalizeModal");

  function openPersonalizeModal() {
    if (personalizeModal) {
      personalizeModal.classList.add("show");
      if (typeof umami !== "undefined") {
        umami.track("modal_opened", { modal: "cards_personalize" });
      }
    }
  }

  function closePersonalizeModal() {
    if (personalizeModal) personalizeModal.classList.remove("show");
  }

  if (btnOpenPersonalize) btnOpenPersonalize.addEventListener("click", openPersonalizeModal);
  if (btnClosePersonalize) btnClosePersonalize.addEventListener("click", closePersonalizeModal);
  if (btnDonePersonalize) btnDonePersonalize.addEventListener("click", closePersonalizeModal);

  if (personalizeModal) {
    personalizeModal.addEventListener("click", (e) => {
      if (e.target === personalizeModal) closePersonalizeModal();
    });
  }

  const serviceSelect = document.getElementById("cardsServiceSelect");
  if (serviceSelect) {
    serviceSelect.addEventListener("change", (e) => {
      currentService = e.target.value;
      if (typeof umami !== "undefined") {
        umami.track("Cards Service Changed", { service: currentService });
      }
      renderLayouts();
      saveCardsState("layout");
    });
  }

  const colorPickerBtn = document.getElementById("btnCardsColorPicker");
  const colorInput = document.getElementById("cardsColorInput");
  const resetColorBtn = document.getElementById("btnResetCardsColor");

  if (colorPickerBtn && colorInput) {
    colorPickerBtn.addEventListener("click", () => {
      colorInput.click();
    });

    colorInput.addEventListener("input", (e) => {
      customColor = e.target.value;
      colorPickerBtn.style.backgroundColor = customColor;
      colorPickerBtn.style.borderColor = customColor;
      if (resetColorBtn) resetColorBtn.style.display = "flex";
      renderLayouts();
      saveCardsState("layout");
    });

    colorInput.addEventListener("change", (e) => {
      if (typeof umami !== "undefined") {
        umami.track("Cards Color Selected", { color: e.target.value });
      }
    });
  }

  if (resetColorBtn) {
    resetColorBtn.addEventListener("click", () => {
      customColor = null;
      if (colorPickerBtn) {
        colorPickerBtn.style.backgroundColor = "";
        colorPickerBtn.style.borderColor = "";
      }
      resetColorBtn.style.display = "none";
      if (typeof umami !== "undefined") {
        umami.track("Cards Color Reset");
      }
      renderLayouts();
      saveCardsState("layout");
    });
  }

  const downloadBtn = document.getElementById("btnDownloadCard");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (typeof umami !== "undefined") {
        umami.track("Cards Download Initiated", {
          mode: currentMode,
          layout: currentLayout,
          service: currentService,
        });
      }
      if (currentMode === "animated" && currentAnimatedUrl) {
        exportAnimatedCardVideo();
      } else {
        exportStaticCardImage();
      }
    });
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
